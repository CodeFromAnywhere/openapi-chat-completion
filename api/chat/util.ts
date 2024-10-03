import { fetchWithTimeout, OpenapiDocument } from "edge-util";
export const chatCompletionSecrets = {
  // first one is default basepath
  "https://api.openai.com/v1": process.env.OPENAI_API_KEY,
  "https://api.groq.com/openai/v1": process.env.GROQ_API_KEY,
  "https://anthropic.actionschema.com": process.env.ANTHROPIC_API_KEY,

  // for testing locally
  // "http://localhost:3000": process.env.ANTHROPIC_API_KEY,
};

export const defaultModel = "gpt-4o-mini";
export const defaultBasePath = "https://api.openai.com/v1";

/** Useful utility for streams! */
export async function pipeResponseToController<T>(
  response: Response,
  controller: ReadableStreamDefaultController,
  reduceFn: (previous: T, current: any, index: number) => T,
  initialValue: T,
) {
  let cumulativeValue = initialValue;
  let index = 0;
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        break;
      }
      if (reduceFn) {
        cumulativeValue = reduceFn(cumulativeValue, value, index + 1);
      }

      controller.enqueue(value);
    }
  } catch (error) {
    controller.error(error);
  }

  return cumulativeValue;
}

const openapis: { [url: string]: OpenapiDocument } = {};

/** Fetches openapi but with cache */
export const fetchOpenapi = async (openapiUrl: string | undefined) => {
  if (!openapiUrl) {
    return;
  }

  if (openapis[openapiUrl]) {
    // NB: cached in memory
    return openapis[openapiUrl];
  }

  const isYaml = openapiUrl.endsWith(".yaml");

  const { json, status, statusText, text } =
    await fetchWithTimeout<OpenapiDocument>(
      openapiUrl,
      {
        headers: isYaml
          ? undefined
          : {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
      },
      30000,
    );

  if (json) {
    // NB: set cache
    openapis[openapiUrl] = json;
  }

  if (!json) {
    console.log({ status, statusText, text });
  }

  return json || undefined;
};
