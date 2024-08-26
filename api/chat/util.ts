export const chatCompletionSecrets = {
  // first one is default basepath
  "https://api.openai.com/v1": process.env.OPENAI_API_KEY,
  "https://api.groq.com/openai/v1": process.env.GROQ_API_KEY,
  "https://anthropic.actionschema.com": process.env.ANTHROPIC_API_KEY,
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
