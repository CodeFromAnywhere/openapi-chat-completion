export type FullToolCallDelta = {
  id: string;
  index: number;
  type: "function";
  function: { name: string; arguments: string };
};
export type PartialToolCallDelta = {
  type: undefined;
  id: undefined;
  index: number;
  function: { arguments: string };
};

export interface ChatCompletionChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  system_fingerprint: string;
  service_tier?: string | null;
  /** only given if setting stream_options: {"include_usage": true} in request, only given in last stream chunk */
  usage?: null | {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
  choices: {
    index: number;
    delta:
      | {
          role: string;
          content?: string | null;
          /** Important: openai has this type where arguments come later and must be augmented in order. Groq does just have the first one. Badly documented! */
          tool_calls?: (FullToolCallDelta | PartialToolCallDelta)[];

          /** Our own addition. Given when tools have been executed*/
          tools?: any[];
        }
      | {
          role: undefined;
          content: undefined;
          tool_calls: undefined;
          tools: undefined;
        };
    logprobs: null;
    finish_reason: null;
  }[];
  //extra info from different parties
  x_groq?: any;
  x_actionschema?: any;
}

// additions by me
export type ChatCompletionExtension = {
  basePath?: string;
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
  stream_options?: { include_usage?: boolean };
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
