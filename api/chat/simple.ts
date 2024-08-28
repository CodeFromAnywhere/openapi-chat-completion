import {
  ChatCompletionChunk,
  ChatCompletionExtension,
  ChatCompletionInput,
} from "../types";
import { defaultModel } from "./util.js";

const getSimpleResponse = async (context: {
  q: string | null;
  openapiUrl: string | null;
  model: string | null;
  originUrl: string;
  basePath: string | null;
}) => {
  const { model, openapiUrl, basePath, originUrl, q } = context;
  if (!q) {
    return new Response("Provide a message", { status: 422 });
  }
  const openapiSuffix = openapiUrl ? `?openapiUrl=${openapiUrl}` : "";
  const chatCompletionUrl = `${originUrl}/chat/completions${openapiSuffix}`;

  const body: ChatCompletionInput & ChatCompletionExtension = {
    messages: [{ role: "user", content: q }],
    model: model || defaultModel,
    basePath: basePath || undefined,
    stream: true,
    stream_options: { include_usage: true },
  };

  // Forward the request to the chat completion endpoint
  const response = await fetch(chatCompletionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return new Response(await response.text(), {
      status: response.status,
      statusText: response.statusText,
    });
  }

  const reader = response.body?.getReader();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        buffer += new TextDecoder().decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;

          try {
            const parsedChunk: ChatCompletionChunk = JSON.parse(
              line.replace(/^data: /, ""),
            );
            const content = parsedChunk.choices[0]?.delta?.content;

            if (content !== undefined && content !== null) {
              controller.enqueue(encoder.encode(content));
            }
          } catch (error) {
            console.error("Error parsing chunk:", error);
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
};
export const getSimpleResponsePostRequest = async (request: Request) => {
  const url = new URL(request.url);
  const model = url.searchParams.get("model");
  const context = await request.json();
  return getSimpleResponse({ ...context, originUrl: url.origin, model });
};

export const getSimpleResponseGetRequest = async (request: Request) => {
  const url = new URL(request.url);
  // the first part can contain the openapiUrl, but if it's just 'chat', we omit openapiUrl
  const [id, ...rest] = url.pathname.slice(1).split("/");
  const path = id === "chat" ? "chat/" + rest.join("/") : rest.join("/");
  const openapiUrl = id === "chat" ? null : decodeURIComponent(id);

  const model = url.searchParams.get("model");
  const basePath = url.searchParams.get("basePath");
  const q = url.searchParams.get("q");

  return getSimpleResponse({
    model,
    openapiUrl,
    originUrl: url.origin,
    q,
    basePath,
  });
};
