export const config = { runtime: "edge" };
export const GET = async (request) => {
    const url = new URL(request.url);
    const model = url.searchParams.get("model");
    const q = url.searchParams.get("q");
    const openapiUrl = url.searchParams.get("openapiUrl");
    if (!q || !model) {
        return new Response("Provide a message/model/openapiUrl", { status: 422 });
    }
    const openapiSuffix = openapiUrl ? `?openapiUrl=${openapiUrl}` : "";
    const chatCompletionUrl = `${url.origin}/${model}/chat/completions${openapiSuffix}`;
    const body = {
        messages: [{ role: "user", content: q }],
        model,
        stream: true,
    };
    // Forward the request to the chat completion endpoint
    const response = await fetch(chatCompletionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
        });
    }
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunks = new TextDecoder().decode(value).split("\n");
                for (const chunk of chunks) {
                    if (chunk.trim() === "")
                        continue;
                    try {
                        const parsedChunk = JSON.parse(chunk.replace(/^data: /, ""));
                        const content = parsedChunk.choices[0]?.delta?.content;
                        // NB: Only content for now. Maybe in the future, also add markdown sections showing tool use.
                        if (content !== undefined && content !== null) {
                            controller.enqueue(encoder.encode(content));
                        }
                    }
                    catch (error) {
                        //  console.error("Error parsing chunk:");
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
//# sourceMappingURL=simple.js.map