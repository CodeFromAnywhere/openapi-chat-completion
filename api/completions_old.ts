/**

GOAL: 

- ✅ keep executing functions without interuption
- ✅ have arguments!!! openai has the tool call input in separate stream messages, while groq just has it all at once. we need to aggregrate them!
- ✅ keep spec same as  https://platform.openai.com/docs/api-reference/chat/object
- ✅ runs on edge
- ✅ make streaming optional

*/
import {
  ChatCompletionChunk,
  ChatCompletionInput,
  ChatCompletionOutput,
} from "./types";

export const config = {
  runtime: "edge",
};
// const apiKey = process.env.GROQ_API_KEY;
// const model = "llama3-groq-70b-8192-tool-use-preview";
// const basePath = "https://api.groq.com/openai/v1";
const apiKey = process.env.OPENAI_API_KEY;
const model = "gpt-4o-mini";
const basePath = "https://api.openai.com/v1";

// Define your tools
const tools: ChatCompletionInput["tools"] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Gets the weather of a city",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "The city",
          },
        },
        required: ["city"],
      },
    },
  },
];

// Mock function to get weather (replace with actual API call in production)
async function getCurrentWeather(context: { city: string }) {
  const { city } = context;
  console.log("Got " + city);
  // This is a mock implementation. In a real scenario, you'd call a weather API here.
  return {
    city,
    temperature: Math.round(Math.random() * 80) - 50,
    unit: "celcius",
    condition: "Sunny",
  };
}

async function streamOpenAIResponse(
  messages: ChatCompletionInput["messages"],
  controller: ReadableStreamDefaultController<any>,
) {
  if (!apiKey) {
    controller.enqueue(
      new TextEncoder().encode("OpenAI API key not configured"),
    );
    controller.close();
    return;
  }
  const body: ChatCompletionInput = {
    model,
    messages: messages,
    stream: true,
    tools: tools,
  };

  const openaiResponse = await fetch(`${basePath}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!openaiResponse.ok) {
    const errorText = await openaiResponse.text();
    controller.enqueue(
      new TextEncoder().encode(`OpenAI API error: ${errorText}`),
    );
    controller.close();
    return;
  }

  const reader = openaiResponse.body?.getReader();
  if (!reader) {
    controller.close();
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let accumulatedMessage = "";
  let toolCalls: ChatCompletionChunk["choices"][number]["delta"]["tool_calls"] =
    [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.includes("[DONE]")) {
        continue;
      }

      if (line.startsWith("data: ")) {
        try {
          const data: ChatCompletionChunk = JSON.parse(line.slice(6));
          const delta = data.choices[0]?.delta;
          // directly pass through the encoding on per-line basis, everything except [DONE]
          controller.enqueue(new TextEncoder().encode("\n\n" + line));

          if (delta?.tool_calls) {
            toolCalls = toolCalls.concat(delta.tool_calls);
          } else if (delta?.content) {
            accumulatedMessage += delta.content;
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      }
    }
  }

  return { accumulatedMessage, toolCalls };
}

const getRequestStream = (request: Request) => {
  const stream = new ReadableStream({
    async start(controller) {
      let messages: ChatCompletionInput["messages"] = [
        {
          role: "user",
          content:
            "Get the temperature in San Fransisco 7 days in a row, using the function. Make a nice story.",
        },
      ];

      while (true) {
        // listen and pass through all messages
        const result = await streamOpenAIResponse(messages, controller);

        if (!result) {
          break;
        }

        const { accumulatedMessage, toolCalls } = result;

        if (toolCalls.length === 0) {
          break;
        }

        const uniqueToolcalls = toolCalls
          .filter((x) => x.type === "function")
          .map((item) => {
            // This is needed for openai!

            const argumentConcat = toolCalls
              .filter((x) => x.index === item.index)
              .map((x) => x.function.arguments)
              .join("");

            return {
              ...item,
              function: { ...item.function, arguments: argumentConcat },
            };
          });

        // add assistant messages to final response
        const message: ChatCompletionInput["messages"][number] = {
          role: "assistant",
          content: accumulatedMessage,
          tool_calls: uniqueToolcalls,
        };

        //data:

        messages.push(message);

        const toolMessages = (
          await Promise.all(
            uniqueToolcalls.map(async (toolCall) => {
              if (toolCall.function.name === "get_weather") {
                const weatherData = await getCurrentWeather(
                  JSON.parse(toolCall.function.arguments),
                );
                const message: ChatCompletionInput["messages"][number] = {
                  role: "tool",
                  name: "get_weather",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(weatherData),
                };

                return message;
              }
            }),
          )
        )
          .filter((x) => !!x)
          .map((x) => x!);

        controller.enqueue(
          new TextEncoder().encode(
            "\n\ndata: " +
              JSON.stringify({
                id: "chatcmpl-65e851f8-116b-42b8-a974-226548d8e6a0",
                object: "chat.completion.CHUNK",
                created: Math.round(Date.now() / 1000),
                model,
                system_fingerprint: null,
                choices: [
                  {
                    index: 0,
                    delta: { role: "user", tools: toolMessages },
                    logprobs: null,
                    finish_reason: null,
                  },
                ],
                x_actionschema: {
                  //custom data
                },
              }),
          ),
        );

        messages = messages.concat(toolMessages);
      }

      // TODO: Look at how this is done by chatgpt themselves...
      const full_response = { done: true, messages };
      controller.enqueue(
        new TextEncoder().encode("\n\ndata: " + JSON.stringify(full_response)),
      );
      controller.enqueue(new TextEncoder().encode("\n\n[DONE]"));
      controller.close();
    },
  });

  return stream;
};

async function streamToJsonResponse(stream: ReadableStream<any>) {
  const reader = stream.getReader();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Here there should be some magic! We need to read in all chunks and turn it into a ChatCompletionOutput
    result += new TextDecoder().decode(value);
  }

  // Assuming the result is valid JSON string
  const jsonData = JSON.parse('{ "ok": true }');

  return new Response(JSON.stringify(jsonData), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  });
}

export default async function handler(request: Request) {
  // const { searchParams } = new URL(request.url);
  // const stream = searchParams.get("stream") !== "false";
  // streamRequest(request);
  const stream = true;
  const readableStream = getRequestStream(request);
  if (stream) {
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  //rather than streaming, stream it inhere myself and accumulate the result into a single JSON
  const response = await streamToJsonResponse(readableStream);
  return response;
}
