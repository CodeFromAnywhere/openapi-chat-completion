import { tryParseJson } from "edge-util";
import { findCodeblocks } from "marked-util";

/** Defaults to claude */
export const jsonGpt = async <T>(
  agentOpenapiUrl: string,
  system: string,
  model = "claude-3-5-sonnet-20240620",
  llmBasepath = "https://anthropic.actionschema.com",
  llmApiKey = process.env.ANTHROPIC_TOKEN,
): Promise<{
  status: number;
  result?: T;
  statusText?: string;
  content?: string;
}> => {
  if (!llmApiKey) {
    return { status: 400, statusText: "Please provide an LLM Token" };
  }
  const llmResult = await fetch(
    `https://chat.actionschema.com/${encodeURIComponent(
      agentOpenapiUrl,
    )}/chat/completions`,
    {
      body: JSON.stringify({
        stream: false,
        model,
        messages: [{ role: "system", content: system }],
      }),
      method: "POST",
      headers: {
        "X-BASEPATH": llmBasepath,
        Authorization: `Bearer ${llmApiKey}`,
      },
    },
  );

  if (!llmResult.ok) {
    return { status: llmResult.status, statusText: llmResult.statusText };
  }

  const json = await llmResult.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return {
      status: 422,
      statusText: "Got repsonse but no content",
    };
  }

  const result =
    tryParseJson<T>(content) ||
    tryParseJson<T>(findCodeblocks(content)[0] || "");

  if (!result) {
    return {
      status: 422,
      statusText: "Got response but couldn't parse it",
      content,
    };
  }

  return { status: 200, result, content };
};

export const GET = (request: Request) => {
  //jsongpt
};
