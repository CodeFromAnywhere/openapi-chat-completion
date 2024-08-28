import { Usage } from "../../public/usage";

export const chatCompletionProviders = {
  groq: {
    models: [
      { id: "gemma-7b-it", promptCpm: 0.07, completionCpm: 0.07 },
      { id: "gemma2-9b-it", promptCpm: 0.2, completionCpm: 0.2 },
      { id: "llama3-70b-8192", promptCpm: 0.59, completionCpm: 0.79 },
      { id: "llama3-8b-8192", promptCpm: 0.05, completionCpm: 0.08 },
      {
        id: "llama3-groq-70b-8192-tool-use-preview",
        promptCpm: 0.89,
        completionCpm: 0.89,
      },
      {
        id: "llama3-groq-8b-8192-tool-use-preview",
        promptCpm: 0.19,
        completionCpm: 0.19,
      },
      { id: "mixtral-8x7b-32768", promptCpm: 0.24, completionCpm: 0.24 },
    ],
  },
  openai: {
    models: [
      { id: "gpt-4o", promptCpm: 5.0, completionCpm: 15.0 },
      { id: "gpt-4o-2024-08-06", promptCpm: 2.5, completionCpm: 10.0 },
      { id: "gpt-4o-2024-05-13", promptCpm: 5.0, completionCpm: 15.0 },
      { id: "gpt-4o-mini", promptCpm: 0.15, completionCpm: 0.6 },
      { id: "gpt-4o-mini-2024-07-18", promptCpm: 0.15, completionCpm: 0.6 },
      { id: "gpt-4-turbo", promptCpm: 10.0, completionCpm: 30.0 },
      { id: "gpt-4-turbo-2024-04-09", promptCpm: 10.0, completionCpm: 30.0 },
      { id: "gpt-4", promptCpm: 30.0, completionCpm: 60.0 },
      { id: "gpt-4-32k", promptCpm: 60.0, completionCpm: 120.0 },
      { id: "gpt-4-0125-preview", promptCpm: 10.0, completionCpm: 30.0 },
      { id: "gpt-4-1106-preview", promptCpm: 10.0, completionCpm: 30.0 },
      { id: "gpt-4-vision-preview", promptCpm: 10.0, completionCpm: 30.0 },
      { id: "gpt-3.5-turbo-0125", promptCpm: 0.5, completionCpm: 1.5 },
      { id: "gpt-3.5-turbo-instruct", promptCpm: 1.5, completionCpm: 2.0 },
      { id: "gpt-3.5-turbo-1106", promptCpm: 1.0, completionCpm: 2.0 },
      { id: "gpt-3.5-turbo-0613", promptCpm: 1.5, completionCpm: 2.0 },
      { id: "gpt-3.5-turbo-16k-0613", promptCpm: 3.0, completionCpm: 4.0 },
      { id: "gpt-3.5-turbo-0301", promptCpm: 1.5, completionCpm: 2.0 },
    ],
  },
  anthropic: {
    models: [
      { id: "claude-3-5-sonnet-20240620", promptCpm: 3.0, completionCpm: 15.0 },
      { id: "claude-3-opus-20240229", promptCpm: 15.0, completionCpm: 75.0 },
      { id: "claude-3-sonnet-20240229", promptCpm: 3.0, completionCpm: 15.0 },
      { id: "claude-3-haiku-20240307", promptCpm: 0.25, completionCpm: 1.25 },
    ],
  },
} as const;

export const calculateCost = <
  P extends keyof typeof chatCompletionProviders,
  M = (typeof chatCompletionProviders)[P]["models"][number]["id"],
>(
  context: {
    provider: P;
    model: M;
  } & Usage,
) => {
  const { provider, model, completion_tokens, prompt_tokens } = context;
  console.log(context);
  //@ts-ignore
  const modelInfo = chatCompletionProviders[provider]?.models?.filter(
    (item: any) => item.id === model,
  )[0];
  if (!modelInfo) {
    return;
  }
  const prompt_cost = (prompt_tokens * modelInfo.promptCpm) / 1000000;
  const output_cost = (completion_tokens * modelInfo.completionCpm) / 1000000;
  const total_cost = prompt_cost + output_cost;
  return { prompt_cost, output_cost, total_cost };
};
