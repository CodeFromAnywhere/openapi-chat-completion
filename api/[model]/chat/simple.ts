import { ChatCompletionChunk, ChatCompletionInput } from "../../types";

export const config = { runtime: "edge" };

export const GET = async (request: Request) => {
  const url = new URL(request.url);
  const model = url.searchParams.get("model");
  const q = url.searchParams.get("q");
  const openapiUrl = url.searchParams.get("openapiUrl");

  if (!q || !model) {
    return new Response("Provide a message/model/openapiUrl", { status: 422 });
  }
  const openapiSuffix = openapiUrl ? `?openapiUrl=${openapiUrl}` : "";
  const chatCompletionUrl = `${url.origin}/${model}/chat/completions${openapiSuffix}`;

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
