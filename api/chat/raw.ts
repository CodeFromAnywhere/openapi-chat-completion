import { ChatCompletionExtension, ChatCompletionInput } from "../types";

/** Simple get endpoint to test a stream of a model and see the result in the browser */
export const raw = async (request: Request) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  // the first part can contain the openapiUrl, but if it's just 'chat', we omit openapiUrl
  const [id, ...rest] = url.pathname.slice(1).split("/");
  const path = id === "chat" ? "chat/" + rest.join("/") : rest.join("/");
  const openapiUrl = id === "chat" ? null : decodeURIComponent(id);
  const openapiPrefix = openapiUrl ? encodeURIComponent(openapiUrl) + "/" : "";

  if (!q) {
    return new Response("Provide a message", { status: 422 });
  }

  const chatCompletionUrl = `${url.origin}/${openapiPrefix}chat/completions`;

  const body: ChatCompletionInput & ChatCompletionExtension = {
    messages: [{ role: "user", content: q }],
    // hardcoded!
    basePath: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    stream: true,
    stream_options: { include_usage: true },
  };

  // Forward the request to the chat completion endpoint
  const response = await fetch(chatCompletionUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log(
    "headers",
    response.headers.get("Content-Type"),
    response.headers.get("Cache-Control"),
    response.headers.get("Connection"),
  );

  /*
  should have:

        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
*/

  return response;
};
