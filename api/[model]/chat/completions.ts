import {
  createClient,
  fetchOpenapi,
  getSemanticOpenapi,
  OpenapiDocument,
  tryParseJson,
} from "openapi-util";

import {
  ChatCompletionChunk,
  ChatCompletionInput,
  ChatCompletionOutput,
  FullToolCallDelta,
} from "../../types.js";
import { chatCompletionProviders } from "./util.js";

// can't be done due to openapi-util!!! let's remove fs, prettier, etc from from-anywhere
//export const config = { runtime: "edge" };

type StreamContext = {
  access_token?: string;
  openapiUrl: string;
  targetOpenapi: OpenapiDocument;
  providerBasePath: string;
  llmSecret?: string;
  model: string;
  tools: any[];
  body: any;
  messages: any[];
};

const streamOpenAIResponse = async (
  controller: ReadableStreamDefaultController<any>,
  context: StreamContext,
) => {
  const { messages, model, providerBasePath, tools, llmSecret } = context;

  if (!llmSecret) {
    const error = "OpenAI API key not configured";
    console.error(error);
    controller.enqueue(new TextEncoder().encode(error));
    controller.close();
    return;
  }

  const body: ChatCompletionInput = {
    ...context.body,
    messages: messages,
    model,
    tools,
  };

  const llmResponse = await fetch(`${providerBasePath}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${llmSecret}`,
    },
    body: JSON.stringify(body),
  });

  if (!llmResponse.ok) {
    const errorText = await llmResponse.text();

    const error = `\n\nLLM API error (${llmResponse.status} - ${llmResponse.statusText}) ${errorText}`;
    console.error(error);
    controller.enqueue(new TextEncoder().encode(error));
    controller.close();
    return;
  }

  const reader = llmResponse.body?.getReader();
  if (!reader) {
    const error = `\n\nCouldn't get reader`;
    console.error(error);
    controller.enqueue(new TextEncoder().encode(error));

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
};

/** Expose the OpenAPI at root, only changing the server and path so it's used right. */
export const GET = async (request: Request) => {
  const openapiUrl = new URL(request.url).searchParams.get("openapiUrl");

  const accept = request.headers.get("Accept");

  if (accept?.startsWith("text/html")) {
    const page = !openapiUrl ? "/explore.html" : "/chat.html";
    // default for browsers, ensuring we get html for browsers, openapi otherwise
    const template = await fetch(new URL(request.url).origin + page).then(
      (res) => res.text(),
    );
    const data = { hello: "world" };
    const html = template.replaceAll(
      "const data = {}",
      `const data = ${JSON.stringify(data)}`,
    );
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "max-age=3600, s-maxage=3600",
      },
    });
  }

  if (!openapiUrl) {
    return new Response("Please put an openapiUrl in your pathname");
  }

  const targetOpenapi = await fetchOpenapi(openapiUrl);
  if (!targetOpenapi || !targetOpenapi.paths) {
    return new Response("OpenAPI not found", { status: 400 });
  }

  const originUrl = new URL(request.url).origin;
  const agentOpenapi = await fetch(originUrl + `/openapi.json`).then((res) =>
    res.json(),
  );
  agentOpenapi.servers[0].url = originUrl + `/` + openapiUrl;
  agentOpenapi.paths = {
    "/chat/completions": agentOpenapi.paths["/chat/completions"],
  };

  return new Response(JSON.stringify(agentOpenapi, undefined, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

const getStream = async (
  context: StreamContext,
): Promise<{
  stream?: ReadableStream<any>;
  status?: number;
  message?: string;
}> => {
  const { access_token, openapiUrl, targetOpenapi, model } = context;

  let messages = context?.messages;

  const stream = new ReadableStream({
    async start(controller) {
      let loop = 0;

      while (true) {
        // console.log(`messages before entry`, messages);

        loop++;
        // listen and pass through all messages
        const result = await streamOpenAIResponse(controller, {
          ...context,
          messages,
        });

        // console.log({ loop, result });

        if (!result) {
          console.log("going out");
          break;
        }

        const { accumulatedMessage, toolCalls } = result;

        if (toolCalls.length === 0) {
          break;
        }

        const client = createClient<any>(targetOpenapi, openapiUrl, {
          access_token,
        });

        const uniqueToolcalls = (toolCalls as FullToolCallDelta[])
          .filter((x) => x.type === "function")
          .map((item) => {
            // This is needed for openai!

            const argumentConcat = (toolCalls as FullToolCallDelta[])
              .filter((x) => x.index === item.index)
              .map((x) => x.function.arguments)
              .join("");

            return {
              ...item,
              function: { ...item.function, arguments: argumentConcat },
            };
          });

        console.log({ uniqueToolcalls });

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
            uniqueToolcalls.map(async (tool) => {
              const result = await client(
                tool.function.name,
                tryParseJson(tool.function.arguments) || undefined,
              );

              const message: ChatCompletionInput["messages"][number] = {
                tool_call_id: tool.id,
                role: "tool",
                name: tool.function.name,
                content: JSON.stringify(result),
              };
              return message;
            }),
          )
        )
          .filter((x) => !!x)
          .map((x) => x!);

        console.log({ toolMessages });

        controller.enqueue(
          new TextEncoder().encode(
            "\n\ndata: " +
              JSON.stringify({
                id: "chatcmpl-SOMETHING",
                object: "chat.completion.chunk",
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

        // done for the next round
        messages = messages.concat(toolMessages);
      }

      // TODO: Look at how this is done by chatgpt themselves...
      // const full_response = { done: true, messages };
      // controller.enqueue(
      //   new TextEncoder().encode("\n\ndata: " + JSON.stringify(full_response)),
      // );
      controller.enqueue(new TextEncoder().encode("\n\n[DONE]"));
      controller.close();
    },
  });

  return { stream, status: 200 };
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
  const jsonData: ChatCompletionOutput = JSON.parse('{ "ok": true }');

  return new Response(JSON.stringify(jsonData), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  });
}

export const POST = async (request: Request) => {
  const forcedLlmBasePath = request.headers.get("X-LLM-BASEPATH");
  const forcedLlmSecret = request.headers.get("X-LLM-SECRET");
  const forcedOpenapiSecret = request.headers.get("X-OPENAPI-SECRET");
  // for now, must be forced through a header
  const access_token = forcedOpenapiSecret || undefined;
  const url = new URL(request.url);
  const openapiUrl = url.searchParams.get("openapiUrl");
  const model = url.searchParams.get("model");

  console.log("entered", { access_token, openapiUrl });

  if (!openapiUrl) {
    return new Response("Please put an openapiUrl in your pathname", {
      status: 400,
    });
  }

  // TODO: Get this from thing
  const operationIds: string[] | undefined = undefined; //[];

  const targetOpenapi = await fetchOpenapi(openapiUrl);
  if (!targetOpenapi || !targetOpenapi.paths) {
    return new Response("OpenAPI not found", { status: 400 });
  }

  const semanticOpenapi = getSemanticOpenapi(
    targetOpenapi,
    openapiUrl,
    operationIds,
  );

  if (!semanticOpenapi) {
    console.log({ targetOpenapi, openapiUrl });
    return new Response("SemanticOpenAPI not found", { status: 400 });
  }

  const body: ChatCompletionInput = await request.json();
  if (body.tools && body.tools.length > 0) {
    return new Response("Tools need to be supplied through the OpenAPI", {
      status: 400,
    });
  }

  const [provider, ...chunks] = model!.split(".");
  const finalModel = chunks.join(".");

  if (
    !(forcedLlmBasePath && forcedLlmSecret) &&
    !Object.keys(chatCompletionProviders).includes(provider)
  ) {
    return new Response("Unsupported provider", { status: 400 });
  }

  const providerBasePath =
    forcedLlmBasePath ||
    chatCompletionProviders[provider as keyof typeof chatCompletionProviders]
      .baseUrl;

  const llmSecret = forcedLlmBasePath
    ? forcedLlmSecret || undefined
    : chatCompletionProviders[provider as keyof typeof chatCompletionProviders]
        .secret;

  const tools: ChatCompletionInput["tools"] = Object.keys(
    semanticOpenapi.properties,
  ).map((operationId) => {
    const { input, description, summary } =
      semanticOpenapi.properties[operationId].properties;

    // TODO: TBD if this is the best way
    const fullDescription = summary ? summary + "\n\n" : "" + description || "";
    return {
      type: "function",
      function: {
        name: operationId,
        description: fullDescription,
        parameters: input,
      },
    };
  });

  // copy to keep body.messages original
  let messages = [...body.messages];
  const stream = body.stream;

  const readableStream = await getStream({
    access_token,
    openapiUrl,
    targetOpenapi,
    body,
    messages,
    model: finalModel,
    providerBasePath,
    tools,
    llmSecret,
  });

  if (!readableStream.stream) {
    console.log("NO STREAM BACK");
    return new Response(readableStream.message, {
      status: readableStream.status,
    });
  }

  if (stream) {
    return new Response(readableStream.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  //rather than streaming, stream it inhere myself and accumulate the result into a single JSON
  const response = await streamToJsonResponse(readableStream.stream);
  return response;
};