import {
  createClient,
  fetchOpenapi,
  getSemanticOpenapi,
  tryParseJson,
} from "openapi-util";
import { ChatCompletionInput, ChatCompletionOutput } from "./types";

/** chat completion endpoint  */
const llmCall = async (context: {
  providerBasePath: string;
  llmSecret?: string;
  model: string;
  tools: any[];
  body: any;
  messages: any[];
}) => {
  const { body, llmSecret, messages, model, providerBasePath, tools } = context;
  const response = await fetch(providerBasePath + "/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llmSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      // only overwrite these
      messages,
      model,
      tools,
    } satisfies ChatCompletionInput),
  })
    .then(async (response) => {
      const text = await response.text();
      const json = tryParseJson<ChatCompletionOutput>(text);
      if (response.status !== 200 || !json) {
        return {
          status: response.status,
          statusText: response.statusText,
          text,
          json: undefined,
        };
      }
      return {
        status: response.status,
        statusText: response.statusText,
        text: undefined,
        json,
      };
    })
    .catch((e) => {
      console.log("Couldn't do it", e);
      return {
        status: undefined,
        statusText: undefined,
        text: String(e.message),
        json: undefined,
      };
    });
  return response;
};

const getPathUrl = (requestUrl: string) => {
  // Should expose an OpenAPI
  const requestUrlObject = new URL(requestUrl);
  const pathUrl = requestUrlObject.href.slice(
    requestUrlObject.origin.length + 1,
  );
  try {
    const pathUrlObject = new URL(pathUrl);
    pathUrlObject.searchParams.delete("path");
    const pathUrlString = pathUrlObject.toString();
    return pathUrlString;
  } catch (e) {
    return;
  }
};
/**
 * Function that strips the path so it doesn't matter if the sdk requires the /chat/completions path or not */
const withoutPathnameSuffix = (url: string | undefined, suffix: string) => {
  if (!url) {
    return;
  }
  const urlObject = new URL(url);

  const pathname = urlObject.pathname.endsWith(suffix)
    ? urlObject.pathname.slice(0, urlObject.pathname.length - suffix.length)
    : urlObject.pathname;

  const newUrl =
    urlObject.origin + pathname + urlObject.search + urlObject.hash;
  return newUrl;
};

/** Expose the OpenAPI at root, only changing the server and path so it's used right. */
export const GET = async (request: Request) => {
  const openapiUrl = withoutPathnameSuffix(
    getPathUrl(request.url),
    "/chat/completions",
  );

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
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!openapiUrl) {
    return new Response("Please put an openapiUrl in your pathname");
  }

  const targetOpenapi = await fetchOpenapi(openapiUrl);
  if (!targetOpenapi) {
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

export const POST = async (request: Request) => {
  const forcedLlmBasePath = request.headers.get("X-LLM-BASEPATH");
  const forcedLlmSecret = request.headers.get("X-LLM-SECRET");
  const forcedOpenapiSecret = request.headers.get("X-OPENAPI-SECRET");
  // for now, must be forced through a header
  const access_token = forcedOpenapiSecret || undefined;
  const openapiUrl = withoutPathnameSuffix(
    getPathUrl(request.url),
    "/chat/completions",
  );

  if (!openapiUrl) {
    return new Response("Please put an openapiUrl in your pathname");
  }
  const operationIds: string[] = [];

  const targetOpenapi = await fetchOpenapi(openapiUrl);
  if (!targetOpenapi) {
    return new Response("OpenAPI not found", { status: 400 });
  }

  const semanticOpenapi = getSemanticOpenapi(
    targetOpenapi,
    openapiUrl,
    operationIds,
  );
  if (!semanticOpenapi) {
    return new Response("OpenAPI not found", { status: 400 });
  }

  try {
    const body: ChatCompletionInput = await request.json();

    if (body.tools && body.tools.length > 0) {
      return new Response("Tools need to be supplied through the OpenAPI", {
        status: 500,
      });
    }

    const [provider, ...chunks] = body.model.split("/");
    const model = chunks.join("/");

    const chatCompletionProviders = {
      groq: {
        baseUrl: "https://api.groq.com/openai/v1",
        secret: process.env.GROQ_SECRET,
      },
      openai: {
        baseUrl: "https://api.openai.com/v1",
        secret: process.env.OPENAI_SECRET,
      },
    };

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
      : chatCompletionProviders[
          provider as keyof typeof chatCompletionProviders
        ].secret;

    const tools: ChatCompletionInput["tools"] = Object.keys(
      semanticOpenapi.properties,
    ).map((operationId) => {
      const { input, description, summary } =
        semanticOpenapi.properties[operationId].properties;

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
    });

    // copy to keep body.messages original
    const messages = [...body.messages];

    const response = await llmCall({
      providerBasePath,
      llmSecret,
      model,
      tools,
      body,
      messages,
    });

    if (!response.json) {
      return new Response(response.text, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    let completionMessage = response.json.choices[0].message;

    if (completionMessage.tool_calls) {
      while (completionMessage.tool_calls) {
        const client = createClient<any>(targetOpenapi, openapiUrl, {
          access_token,
        });

        const toolOutputMessages = await Promise.all(
          completionMessage.tool_calls.map(async (tool) => {
            const result = client(
              tool.function.name,
              tryParseJson(tool.function.arguments) || undefined,
            );

            return {
              tool_call_id: tool.id,
              role: "tool",
              content: JSON.stringify(result),
            };
          }),
        );

        const followUpResponse = await llmCall({
          providerBasePath,
          body,
          llmSecret,
          messages: messages.concat(
            toolOutputMessages as ChatCompletionInput["messages"],
          ),
          model,
          tools,
        });

        completionMessage = followUpResponse.json?.choices[0].message!;
        if (completionMessage) {
          messages.push(completionMessage);
        }
      }
    }

    const responseMessages = messages.slice(body.messages.length);
    if (responseMessages.length > 1) {
      // Merge multiple messages into one
      response.json.choices[0].message = {
        role: "assistant",
        content: responseMessages
          .map((item) =>
            typeof item.content === "string"
              ? { type: "text", text: item.content }
              : (item as unknown as {
                  type: string;
                  text?: string;
                  image_url?: any;
                }),
          )
          .map((item) =>
            item.image_url ? `![](${item.image_url})` : item.text,
          )
          .join("\n\n"),
      };
    }

    return new Response(JSON.stringify(response, undefined, 2), {
      status: 200,
      statusText: "OK",
    });
  } catch (e) {
    return new Response("Something went wrong", { status: 500 });
  }
};