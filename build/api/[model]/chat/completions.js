import { createClient, fetchOpenapi, getSemanticOpenapi, tryParseJson, } from "openapi-util";
import { chatCompletionProviders } from "./util.js";
// can't be done due to openapi-util!!! let's remove fs, prettier, etc from from-anywhere
//export const config = { runtime: "edge" };
const createDeltaString = (model, message) => {
    const delta = {
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
const streamLlmResponse = async (controller, context) => {
    const { messages, model, providerBasePath, tools, llmSecret } = context;
    if (!llmSecret) {
        const error = "OpenAI API key not configured";
        console.error(error);
        controller.enqueue(new TextEncoder().encode(createDeltaString(model, error)));
        controller.close();
        return;
    }
    const body = {
        ...context.body,
        messages: messages,
        model,
        tools: !tools || tools.length === 0 ? undefined : tools,
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
        controller.enqueue(new TextEncoder().encode(createDeltaString(model, error)));
        controller.close();
        return;
    }
    const reader = llmResponse.body?.getReader();
    if (!reader) {
        const error = `\n\nCouldn't get reader`;
        console.error(error);
        controller.enqueue(new TextEncoder().encode(createDeltaString(model, error)));
        controller.close();
        return;
    }
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedMessage = "";
    let toolCalls = [];
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
                    const data = JSON.parse(line.slice(6));
                    const delta = data?.choices[0]?.delta;
                    // directly pass through the encoding on per-line basis, everything except [DONE]
                    controller.enqueue(new TextEncoder().encode("\n\n" + line));
                    if (delta?.tool_calls) {
                        toolCalls = toolCalls.concat(delta.tool_calls);
                    }
                    else if (delta?.content !== undefined) {
                        accumulatedMessage += delta.content;
                    }
                    else {
                        console.dir(data, { depth: 99 });
                    }
                }
                catch (error) {
                    console.error("Error parsing JSON:", error);
                    controller.enqueue(new TextEncoder().encode(createDeltaString(model, "Error parsing data JSON")));
                }
            }
        }
    }
    return { accumulatedMessage, toolCalls };
};
/**
 * Expose the OpenAPI at root, only changing the server and path so it's used right.
 */
export const GET = async (request) => {
    const openapiUrl = new URL(request.url).searchParams.get("openapiUrl");
    console.log(openapiUrl);
    const accept = request.headers.get("Accept");
    if (accept?.startsWith("text/html")) {
        const page = !openapiUrl ? "/explore.html" : "/chat.html";
        // default for browsers, ensuring we get html for browsers, openapi otherwise
        const template = await fetch(new URL(request.url).origin + page).then((res) => res.text());
        const data = { hello: "world" };
        const html = template.replaceAll("const data = {}", `const data = ${JSON.stringify(data)}`);
        return new Response(html, {
            status: 200,
            headers: {
                "Content-Type": "text/html",
                // "Cache-Control": "max-age=60, s-maxage=60",
            },
        });
    }
    if (!openapiUrl) {
        return new Response("Please put an openapiUrl in your pathname", {
            status: 422,
        });
    }
    const targetOpenapi = await fetchOpenapi(openapiUrl);
    if (!targetOpenapi || !targetOpenapi.paths) {
        return new Response("OpenAPI not found", { status: 404 });
    }
    const originUrl = new URL(request.url).origin;
    const agentOpenapi = await fetch(originUrl + `/openapi.json`).then((res) => res.json());
    agentOpenapi.servers[0].url = originUrl + `/` + openapiUrl;
    agentOpenapi.paths = {
        "/chat/completions": agentOpenapi.paths["/chat/completions"],
    };
    return new Response(JSON.stringify(agentOpenapi, undefined, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};
const getStream = async (context) => {
    const { access_token, openapiUrl, targetOpenapi, model } = context;
    let messages = context?.messages;
    const stream = new ReadableStream({
        async start(controller) {
            let loop = 0;
            while (true) {
                // console.log(`messages before entry`, messages);
                loop++;
                // listen and pass through all messages
                const result = await streamLlmResponse(controller, {
                    ...context,
                    messages,
                });
                // console.log({ loop, result });
                if (!result) {
                    console.log("going out");
                    break;
                }
                const { accumulatedMessage, toolCalls } = result;
                if (!targetOpenapi || !openapiUrl || toolCalls.length === 0) {
                    // if there are no tool calls, we can safely break out, everything has been said.
                    break;
                }
                const client = createClient(targetOpenapi, openapiUrl, {
                    access_token,
                });
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
                console.dir({ uniqueToolcalls }, { depth: 99 });
                // add assistant messages to final response
                const message = {
                    role: "assistant",
                    content: accumulatedMessage,
                    tool_calls: uniqueToolcalls,
                };
                //data:
                messages.push(message);
                const toolMessages = (await Promise.all(uniqueToolcalls.map(async (tool) => {
                    const result = await client(tool.function.name, tryParseJson(tool.function.arguments) || undefined);
                    const message = {
                        tool_call_id: tool.id,
                        role: "tool",
                        name: tool.function.name,
                        content: JSON.stringify(result),
                    };
                    return message;
                })))
                    .filter((x) => !!x)
                    .map((x) => x);
                console.dir({ toolMessages }, { depth: 99 });
                const delta = {
                    id: "chatcmpl-SOMETHING",
                    object: "chat.completion.chunk",
                    created: Math.round(Date.now() / 1000),
                    model,
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
                controller.enqueue(new TextEncoder().encode("\n\ndata: " + JSON.stringify(delta)));
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
export const POST = async (request) => {
    const forcedLlmBasePath = request.headers.get("X-LLM-BASEPATH");
    const forcedLlmSecret = request.headers.get("X-LLM-SECRET");
    const forcedOpenapiSecret = request.headers.get("X-OPENAPI-SECRET");
    // for now, must be forced through a header
    const access_token = forcedOpenapiSecret || undefined;
    const url = new URL(request.url);
    const openapiUrl = url.searchParams.get("openapiUrl");
    const model = url.searchParams.get("model");
    console.log("entered", { access_token, openapiUrl });
    // if (!openapiUrl) {
    //   return new Response("Please put an openapiUrl in your pathname", {
    //     status: 400,
    //   });
    // }
    // // TODO: Get this from thing
    const operationIds = undefined;
    const targetOpenapi = openapiUrl ? await fetchOpenapi(openapiUrl) : undefined;
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
    const semanticOpenapi = targetOpenapi && openapiUrl
        ? getSemanticOpenapi(targetOpenapi, openapiUrl, operationIds)
        : undefined;
    console.dir({ semanticOpenapi }, { depth: 6 });
    // if (!semanticOpenapi) {
    //   console.log("SEMANTIC NOT FOUND", { openapiUrl });
    //   return new Response("SemanticOpenAPI not found", { status: 400 });
    // }
    const body = await request.json();
    if (body.tools && body.tools.length > 0) {
        return new Response("Tools need to be supplied through the OpenAPI", {
            status: 400,
        });
    }
    const [provider, ...chunks] = model.split(".");
    const finalModel = chunks.join(".");
    if (!(forcedLlmBasePath && forcedLlmSecret) &&
        !Object.keys(chatCompletionProviders).includes(provider)) {
        return new Response("Unsupported provider", { status: 400 });
    }
    const providerBasePath = forcedLlmBasePath ||
        chatCompletionProviders[provider]
            .baseUrl;
    const llmSecret = forcedLlmBasePath
        ? forcedLlmSecret || undefined
        : chatCompletionProviders[provider]
            .secret;
    const tools = semanticOpenapi
        ? Object.keys(semanticOpenapi.properties).map((operationId) => {
            const { input, description, summary } = semanticOpenapi.properties[operationId].properties;
            // TODO: TBD if this is the best way
            const fullDescription = summary
                ? summary + "\n\n"
                : "" + description || "";
            return {
                type: "function",
                function: {
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
        hasOpenapi: !!targetOpenapi,
        hasSemanticOpenapi: !!semanticOpenapi,
    });
    // copy to keep body.messages original
    let messages = [...body.messages];
    const stream = body.stream;
    const readableStream = await getStream({
        access_token,
        body,
        messages,
        model: finalModel,
        providerBasePath,
        llmSecret,
        openapiUrl,
        targetOpenapi,
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
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }
    //rather than streaming, stream it inhere myself and accumulate the result into a single JSON
    const response = await streamToJsonResponse2(readableStream.stream);
    return new Response(JSON.stringify(response), { status: 200 });
};
// New function to convert stream to JSON response
async function streamToJsonResponse2(stream) {
    const reader = stream.getReader();
    let accumulatedResponse = "";
    let jsonResponse = {};
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        // Decode the chunk and add it to the accumulated response
        accumulatedResponse += new TextDecoder().decode(value);
        // Split the accumulated response by lines
        const lines = accumulatedResponse.split("\n");
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const jsonString = line.slice(6); // Remove 'data: ' prefix
                if (jsonString.trim() === "[DONE]")
                    continue;
                try {
                    const parsedJson = JSON.parse(jsonString);
                    // Merge the parsed JSON into the response
                    jsonResponse = { ...jsonResponse, ...parsedJson };
                }
                catch (error) {
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
async function streamToJsonResponse(stream) {
    const reader = stream.getReader();
    let result = "";
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
                console.log({ chunk, parsedChunk });
                // NB: Only content for now
                if (content !== undefined && content !== null) {
                    result += content;
                }
            }
            catch (error) {
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
//# sourceMappingURL=completions.js.map