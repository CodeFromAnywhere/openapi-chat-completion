export const config = { runtime: "edge" };
/** Simple get endpoint to test a stream of a model and see the result in the browser */
export const GET = async (request) => {
    const url = new URL(request.url);
    const model = url.searchParams.get("model");
    const q = url.searchParams.get("q");
    const openapiUrl = url.searchParams.get("openapiUrl");
    if (!q || !model) {
        return new Response("Provide a message/model", { status: 422 });
    }
    const openapiSuffix = openapiUrl ? `?openapiUrl=${openapiUrl}` : "";
    const chatCompletionUrl = `${url.origin}/${model}/chat/completions${openapiSuffix}`;
    const body = {
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
//# sourceMappingURL=get.js.map