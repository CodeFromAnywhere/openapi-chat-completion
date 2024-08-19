export const chatCompletionProviders: {
  [providerSlug: string]: {
    baseUrl: string;
    secret: any;
  };
} = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    secret: process.env.GROQ_API_KEY,
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    secret: process.env.OPENAI_API_KEY,
  },
  anthropic: {
    baseUrl: "https://chat.actionschema.com/transformers/anthropic",
    secret: process.env.ANTHROPIC_API_KEY,
  },
};

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
