import {
  createClient,
  fetchOpenapi,
  getSemanticOpenapi,
  tryParseJson,
} from "openapi-util";

/** chat completion endpoint  */
const llmCall = async (context: {
  providerBasePath: string;
  llmSecret: string;
  model: string;
  tools: any[];
  body: any;
  messages: any[];
}) => {
  const { body, llmSecret, messages, model, providerBasePath, tools } = context;
  const response = await fetch(providerBasePath, {
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
export type ChatCompletionInput = {
  messages: Array<{
    content:
      | string
      | Array<{
          type: "text" | "image_url";
          text?: string;
          image_url?: {
            url: string;
            detail?: "auto" | "low" | "high";
          };
        }>;
    role: "system" | "user" | "assistant" | "tool" | "function";
    name?: string;
    tool_call_id?: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
    function_call?: {
      name: string;
      arguments: string;
    };
  }>;
  model: string;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  logprobs?: boolean;
  top_logprobs?: number;
  max_tokens?: number;
  n?: number;
  presence_penalty?: number;
  response_format?: {
    type: "text" | "json_object";
  };
  seed?: number;
  stop?: string | string[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  tools?: Array<{
    type: "function";
    function: {
      description?: string;
      name: string;
      parameters?: Record<string, any>;
    };
  }>;
  tool_choice?:
    | "none"
    | "auto"
    | {
        type: "function";
        function: {
          name: string;
        };
      };
  user?: string;
};

export type ChatCompletionOutput = {
  id: string;
  choices: Array<{
    finish_reason:
      | "stop"
      | "length"
      | "tool_calls"
      | "content_filter"
      | "function_call";
    index: number;
    message: {
      content: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
      role: "assistant";
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    logprobs: {
      content: Array<{
        token: string;
        logprob: number;
        bytes: number[] | null;
        top_logprobs: Array<{
          token: string;
          logprob: number;
          bytes: number[] | null;
        }>;
      }> | null;
    } | null;
  }>;
  created: number;
  model: string;
  system_fingerprint: string;
  object: "chat.completion";
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
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

  const llmSecret = process.env.GROQ_API_KEY;

  if (!llmSecret) {
    return new Response("No LLM Secret", { status: 500 });
  }
  try {
    const body: ChatCompletionInput = await request.json();

    const [provider, ...chunks] = body.model.split("/");
    const model = chunks.join("/");

    const chatCompletionBasePaths = {
      groq: "https://api.groq.com/openai/v1/chat/completions",
      openai: "https://api.openai.com/v1/chat/completions",
    };

    if (!Object.keys(chatCompletionBasePaths).includes(provider)) {
      return new Response("Unsupported provider", { status: 400 });
    }

    const providerBasePath =
      chatCompletionBasePaths[provider as keyof typeof chatCompletionBasePaths];

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
        const client = createClient<any>(targetOpenapi, openapiUrl, {});

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
