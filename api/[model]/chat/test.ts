import { ChatCompletionChunk, ChatCompletionInput } from "../../types";

export const config = { runtime: "edge" };

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const model = url.searchParams.get("model");
  const q = url.searchParams.get("q");
  const openapiUrl = url.searchParams.get("openapiUrl");

  if (!q || !model || !openapiUrl) {
    return new Response("Provide a message/model/openapiUrl", { status: 422 });
  }
  const chatCompletionUrl = `${url.origin}/${model}/chat/completions?openapiUrl=${openapiUrl}`;

  const body: ChatCompletionInput = {
    messages: [{ role: "user", content: q }],
    model,
    stream: true,
    stream_options: { include_usage: true },
  };

  // Forward the request to the chat completion endpoint
  const response = await fetch(chatCompletionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return response;
};
