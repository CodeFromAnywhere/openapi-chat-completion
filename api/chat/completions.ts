import {
  createClient,
  getSemanticOpenapi,
  OpenapiDocument,
  fetchOpenapi,
} from "openapi-util-edge";

import {
  ChatCompletionChunk,
  ChatCompletionExtension,
  ChatCompletionInput,
  FullToolCallDelta,
} from "../types.js";
import { chatCompletionSecrets } from "./util.js";
import { OpenapiOperationObject, slugify, tryParseJson } from "edge-util";

const createDeltaString = (model: string, message: string) => {
  const delta: ChatCompletionChunk = {
    id: "",
    created: Math.round(Date.now() / 1000),
    model,
    object: "chat.completion.chunk",
    system_fingerprint: "",
    choices: [
      {
        index: 0,
        finish_reason: null,
        logprobs: null,
        delta: { role: "assistant", content: message },
      },
    ],
  };

  // Must be a single line. Maybe sometimes it's not done?
  return "\n\ndata: " + JSON.stringify(delta);
};
type StreamContext = {
  access_token?: string;
  openapiUrl: string | null;
  targetOpenapi?: OpenapiDocument;
  basePath: string;
  llmSecret?: string;
  tools?: any[];
  body: any;
  messages: any[];
};

const streamLlmResponse = async (
  controller: ReadableStreamDefaultController<any>,
  context: StreamContext,
) => {
  const { messages, basePath, tools, llmSecret } = context;

  if (!llmSecret) {
    const error = "API key not configured";
    console.error(error);
    controller.enqueue(
      new TextEncoder().encode(createDeltaString(context.body.model, error)),
    );
    controller.close();
    return;
  }

  const body: ChatCompletionInput = {
    ...context.body,
    messages: messages,
    model: context.body.model,
    tools: !tools || tools.length === 0 ? undefined : tools,
  };

  const llmResponse = await fetch(`${basePath}/chat/completions`, {
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
    controller.enqueue(
      new TextEncoder().encode(createDeltaString(context.body.model, error)),
    );
    controller.close();
    return;
  }

  const reader = llmResponse.body?.getReader();
  if (!reader) {
    const error = `\n\nCouldn't get reader`;
    console.error(error);
    controller.enqueue(
      new TextEncoder().encode(createDeltaString(context.body.model, error)),
    );

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
      console.log("done", value);
      // controller.enqueue(
      //   new TextEncoder().encode(
      //     createDeltaString(model, "\n\nreader says done\n\n"),
      //   ),
      // );

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

          const delta = data?.choices[0]?.delta;

          // directly pass through the encoding on per-line basis, everything except [DONE]
          controller.enqueue(new TextEncoder().encode("\n\n" + line));
          console.log("delta", delta, data);
          if (delta?.tool_calls) {
            toolCalls = toolCalls.concat(delta.tool_calls);
          } else if (delta?.content !== undefined) {
            accumulatedMessage += delta.content;
          } else {
            console.dir({ message: "weird data", data }, { depth: 99 });
          }
        } catch (error) {
          console.error("Error parsing JSON:", error);

          controller.enqueue(
            new TextEncoder().encode(
              createDeltaString(context.body.model, "Error parsing data JSON"),
            ),
          );
        }
      }
    }
  }

  return { accumulatedMessage, toolCalls };
};

const getStream = async (
  context: StreamContext,
): Promise<{
  stream?: ReadableStream<any>;
  status?: number;
  message?: string;
}> => {
  const { access_token, openapiUrl, targetOpenapi } = context;

  let messages = context?.messages;

  const stream = new ReadableStream({
    async start(controller) {
      let loop = 0;

      while (true) {
        console.log(`messages before entry`, messages);

        loop++;
        // listen and pass through all messages
        const result = await streamLlmResponse(controller, {
          ...context,
          messages,
        });

        console.log({ loop, result });

        if (!result) {
          console.log("going out");
          break;
        }

        const { accumulatedMessage, toolCalls } = result;

        if (!targetOpenapi || !openapiUrl || toolCalls.length === 0) {
          console.log("no toolcalls");
          // If there are no tool calls, we can safely break out, everything has been said.
          break;
        }

        const client = createClient<any>(targetOpenapi, openapiUrl, {
          access_token,
        });

        const uniqueToolcalls = (toolCalls as FullToolCallDelta[])
          .filter((x) => x.type === "function")
          .map((item) => {
            // This is needed for openai and anthropic!
            const argumentConcat = (toolCalls as FullToolCallDelta[])
              .filter((x) => x.index === item.index)
              .map((x) => x.function.arguments)
              .join("");

            console.log({ argumentConcat });

            return {
              ...item,
              function: { ...item.function, arguments: argumentConcat },
            };
          });

        console.dir({ uniqueToolcalls }, { depth: 99 });

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

        console.dir({ toolMessages }, { depth: 99 });

        const delta: ChatCompletionChunk = {
          id: "chatcmpl-SOMETHING",
          object: "chat.completion.chunk",
          created: Math.round(Date.now() / 1000),
          model: context.body.model,
          system_fingerprint: "",
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
        };
        controller.enqueue(
          new TextEncoder().encode("\n\ndata: " + JSON.stringify(delta)),
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

const defaultBasePath = Object.keys(chatCompletionSecrets)[0];

/** Needed specifically for openai which doesn't allow many characters */
const normalizeOpenapi = (openapi: OpenapiDocument) => {
  for (const path in openapi.paths) {
    const methods = ["get", "post", "put", "path", "delete"] as const;
    methods.map((method) => {
      if ((openapi as any).paths[path]![method] as OpenapiOperationObject) {
        console.log("setting", method);

        (openapi as any).paths[path]![method].operationId = slugify(
          (openapi as any).paths[path]![method].operationId,
        );
      }
    });
  }
  return openapi;
};
export const completions = async (request: Request) => {
  const openapiSecret = request.headers.get("X-OPENAPI-SECRET");
  const access_token = openapiSecret || undefined;
  // for now, must be forced through a header
  const Authorization = request.headers.get("Authorization");
  const url = new URL(request.url);

  // the first part can contain the openapiUrl, but if it's just 'chat', we omit openapiUrl
  const [id, ...rest] = url.pathname.slice(1).split("/");
  const path = id === "chat" ? "chat/" + rest.join("/") : rest.join("/");
  const openapiUrl = id === "chat" ? null : decodeURIComponent(id);

  const body: ChatCompletionInput & ChatCompletionExtension =
    await request.json();
  if (body.tools && body.tools.length > 0) {
    return new Response("Tools need to be supplied through the OpenAPI", {
      status: 400,
    });
  }

  const basePath = request.headers.get("X-BASEPATH") || defaultBasePath;

  const llmSecret = Authorization
    ? Authorization.slice("Bearer ".length)
    : chatCompletionSecrets[basePath as keyof typeof chatCompletionSecrets];

  const selfAuthorized = !!Authorization;

  console.log("entered", {
    access_token,
    llmSecret,
    basePath,
    openapiUrl,
    selfAuthorized,
  });

  // if (!openapiUrl) {
  //   return new Response("Please put an openapiUrl in your pathname", {
  //     status: 400,
  //   });
  // }

  // // TODO: Get this from thing
  const operationIds: string[] | undefined = undefined;

  const targetOpenapi = (
    openapiUrl ? await fetchOpenapi(openapiUrl) : undefined
  ) as OpenapiDocument | undefined;

  const normalizedOpenapi = targetOpenapi
    ? normalizeOpenapi(targetOpenapi)
    : undefined;

  // if (!targetOpenapi || !targetOpenapi.paths) {
  //   return new Response("OpenAPI not found", { status: 400 });
  // }

  // TypeError: Body is unusable: Body has already been read
  // const semanticOpenapiFetchUrl = `https://openapi-util.actionschema.com/getSemanticOpenapi?openapiUrl=${encodeURIComponent(openapiUrl)}`;

  // const semanticOpenapi = await fetch(semanticOpenapiFetchUrl, {
  //   headers: { "Content-Type": "application/json" },
  // })
  //   .then(async (res) => {
  //     if (!res.ok) {
  //       console.log(res.status, await res.text(), res.statusText);
  //     }
  //     const json = await res.json();
  //     return json;
  //   })
  //   .catch((e) => {
  //     console.log(
  //       "Couldn't parse semantic openapi",
  //       { semanticOpenapiFetchUrl },
  //       e,
  //     );
  //   });

  const semanticOpenapi =
    normalizedOpenapi && openapiUrl
      ? getSemanticOpenapi(normalizedOpenapi, openapiUrl, operationIds)
      : undefined;

  // if (!semanticOpenapi) {
  //   return new Response("SemanticOpenAPI not found", { status: 400 });
  // }

  const tools: ChatCompletionInput["tools"] = semanticOpenapi
    ? Object.keys(semanticOpenapi.properties).map((operationId) => {
        const { input, description, summary } =
          semanticOpenapi.properties[operationId].properties;

        // TODO: TBD if this is the best way
        const fullDescription = summary
          ? summary + "\n\n"
          : "" + description || "";

        return {
          type: "function",
          function: {
            //todo: fix it
            name: operationId,
            description: fullDescription,
            parameters: input,
          },
        };
      })
    : undefined;

  console.log({
    openapiUrl,
    toolsAmount: tools?.length,
    hasOpenapi: !!normalizedOpenapi,
    hasSemanticOpenapi: !!semanticOpenapi,
  });

  // copy to keep body.messages original
  let messages = [...body.messages];
  const stream = body.stream;

  const readableStream = await getStream({
    access_token,
    body,
    messages,
    basePath,
    llmSecret,
    openapiUrl,
    targetOpenapi: normalizedOpenapi,
    tools,
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
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  //rather than streaming, stream it inhere myself and accumulate the result into a single JSON
  const response = await streamToJsonResponse2(readableStream.stream);
  return new Response(JSON.stringify(response), { status: 200 });
};

// New function to convert stream to JSON response
async function streamToJsonResponse2(stream: ReadableStream): Promise<any> {
  const reader = stream.getReader();
  let accumulatedResponse = "";
  let jsonResponse = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Decode the chunk and add it to the accumulated response
    accumulatedResponse += new TextDecoder().decode(value, { stream: true });

    // Split the accumulated response by lines
    const lines = accumulatedResponse.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonString = line.slice(6); // Remove 'data: ' prefix
        if (jsonString.trim() === "[DONE]") continue;

        try {
          const parsedJson = JSON.parse(jsonString);
          // Merge the parsed JSON into the response
          jsonResponse = { ...jsonResponse, ...parsedJson };
        } catch (error) {
          console.error("Error parsing JSON:", error);
        }
      }
    }

    // Keep any incomplete data for the next iteration
    accumulatedResponse = lines[lines.length - 1];
  }

  return jsonResponse;
}

//doesn't work yet!
async function streamToJsonResponse(stream: ReadableStream<any>) {
  const reader = stream.getReader();
  let result = "";

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunks = new TextDecoder()
      .decode(value, { stream: true })
      .split("\n");
    for (const chunk of chunks) {
      if (chunk.trim() === "") continue;

      try {
        const parsedChunk: ChatCompletionChunk = JSON.parse(
          chunk.replace(/^data: /, ""),
        );
        const content = parsedChunk.choices[0]?.delta?.content;

        // console.log({ chunk, parsedChunk });
        // NB: Only content for now
        if (content !== undefined && content !== null) {
          result += content;
        }
      } catch (error) {
        console.error("Error parsing chunk:", error);
      }
    }
  }

  return new Response(result, {
    headers: {
      //   "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
  });
}
