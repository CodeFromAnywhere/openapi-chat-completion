import { ChatCompletionChunk } from "../../types.js";
import { chatCompletionProviders, pipeResponseToController } from "./util.js";

/**
 * Chat completion aggregator that allows easy access to various LLMs via one API
 */
export const POST = async (request: Request) => {
  const forcedLlmBasePath = request.headers.get("X-LLM-BASEPATH");
  const forcedLlmSecret = request.headers.get("X-LLM-SECRET");
  const forcedOpenapiSecret = request.headers.get("X-OPENAPI-SECRET");
  const Authorization = request.headers.get("Authorization");
  const body = await request.json();

  // for now, must be forced through a header
  const access_token = forcedOpenapiSecret || undefined;
  const isAuthorized = !!Authorization;

  const [provider, ...chunks] = body.model.split(".");

  if (
    !(forcedLlmBasePath && forcedLlmSecret) &&
    !Object.keys(chatCompletionProviders).includes(provider)
  ) {
    return { message: "Providers not available", status: 400 };
  }

  const providerBasePath =
    forcedLlmBasePath ||
    chatCompletionProviders[provider as keyof typeof chatCompletionProviders]
      .baseUrl;

  const llmSecret = forcedLlmBasePath
    ? forcedLlmSecret || undefined
    : chatCompletionProviders[provider as keyof typeof chatCompletionProviders]
        .secret;

  const finalModel = forcedLlmBasePath ? body.model : chunks.join("/");

  return new Response(
    new ReadableStream({
      start: async (controller) => {
        const response = await fetch(`${providerBasePath}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${llmSecret}`,
          },
          body: JSON.stringify({ ...body, model: finalModel, stream: true }),
        });

        const result = await pipeResponseToController(
          response,
          controller,
          (previous, current) => {
            const data: ChatCompletionChunk = JSON.parse(current.slice(6));
            const delta = data.choices[0]?.delta;

            return {
              accumulatedMessage:
                previous.accumulatedMessage + delta.content || "",
              toolCalls: delta.tool_calls
                ? previous.toolCalls.concat(delta.tool_calls)
                : previous.toolCalls,
            };
          },
          {
            accumulatedMessage: "",
            toolCalls:
              [] as ChatCompletionChunk["choices"][number]["delta"]["tool_calls"],
          },
        );

        controller.close();
      },
    }),
  );
};
