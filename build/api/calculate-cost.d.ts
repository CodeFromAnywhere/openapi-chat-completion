import { Usage } from "../public/usage";
export declare const chatCompletionProviders: {
    readonly groq: {
        readonly models: readonly [{
            readonly id: "gemma-7b-it";
            readonly promptCpm: 0.07;
            readonly completionCpm: 0.07;
        }, {
            readonly id: "gemma2-9b-it";
            readonly promptCpm: 0.2;
            readonly completionCpm: 0.2;
        }, {
            readonly id: "llama3-70b-8192";
            readonly promptCpm: 0.59;
            readonly completionCpm: 0.79;
        }, {
            readonly id: "llama3-8b-8192";
            readonly promptCpm: 0.05;
            readonly completionCpm: 0.08;
        }, {
            readonly id: "llama3-groq-70b-8192-tool-use-preview";
            readonly promptCpm: 0.89;
            readonly completionCpm: 0.89;
        }, {
            readonly id: "llama3-groq-8b-8192-tool-use-preview";
            readonly promptCpm: 0.19;
            readonly completionCpm: 0.19;
        }, {
            readonly id: "mixtral-8x7b-32768";
            readonly promptCpm: 0.24;
            readonly completionCpm: 0.24;
        }];
    };
    readonly openai: {
        readonly models: readonly [{
            readonly id: "gpt-4o";
            readonly promptCpm: 5;
            readonly completionCpm: 15;
        }, {
            readonly id: "gpt-4o-2024-08-06";
            readonly promptCpm: 2.5;
            readonly completionCpm: 10;
        }, {
            readonly id: "gpt-4o-2024-05-13";
            readonly promptCpm: 5;
            readonly completionCpm: 15;
        }, {
            readonly id: "gpt-4o-mini";
            readonly promptCpm: 0.15;
            readonly completionCpm: 0.6;
        }, {
            readonly id: "gpt-4o-mini-2024-07-18";
            readonly promptCpm: 0.15;
            readonly completionCpm: 0.6;
        }, {
            readonly id: "gpt-4-turbo";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4-turbo-2024-04-09";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4";
            readonly promptCpm: 30;
            readonly completionCpm: 60;
        }, {
            readonly id: "gpt-4-32k";
            readonly promptCpm: 60;
            readonly completionCpm: 120;
        }, {
            readonly id: "gpt-4-0125-preview";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4-1106-preview";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4-vision-preview";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-3.5-turbo-0125";
            readonly promptCpm: 0.5;
            readonly completionCpm: 1.5;
        }, {
            readonly id: "gpt-3.5-turbo-instruct";
            readonly promptCpm: 1.5;
            readonly completionCpm: 2;
        }, {
            readonly id: "gpt-3.5-turbo-1106";
            readonly promptCpm: 1;
            readonly completionCpm: 2;
        }, {
            readonly id: "gpt-3.5-turbo-0613";
            readonly promptCpm: 1.5;
            readonly completionCpm: 2;
        }, {
            readonly id: "gpt-3.5-turbo-16k-0613";
            readonly promptCpm: 3;
            readonly completionCpm: 4;
        }, {
            readonly id: "gpt-3.5-turbo-0301";
            readonly promptCpm: 1.5;
            readonly completionCpm: 2;
        }];
    };
    readonly anthropic: {
        readonly models: readonly [{
            readonly id: "claude-3-5-sonnet-20240620";
            readonly promptCpm: 3;
            readonly completionCpm: 15;
        }, {
            readonly id: "claude-3-opus-20240229";
            readonly promptCpm: 15;
            readonly completionCpm: 75;
        }, {
            readonly id: "claude-3-sonnet-20240229";
            readonly promptCpm: 3;
            readonly completionCpm: 15;
        }, {
            readonly id: "claude-3-haiku-20240307";
            readonly promptCpm: 0.25;
            readonly completionCpm: 1.25;
        }];
    };
};
export declare const calculateCost: <P extends "groq" | "openai" | "anthropic", M = {
    readonly groq: {
        readonly models: readonly [{
            readonly id: "gemma-7b-it";
            readonly promptCpm: 0.07;
            readonly completionCpm: 0.07;
        }, {
            readonly id: "gemma2-9b-it";
            readonly promptCpm: 0.2;
            readonly completionCpm: 0.2;
        }, {
            readonly id: "llama3-70b-8192";
            readonly promptCpm: 0.59;
            readonly completionCpm: 0.79;
        }, {
            readonly id: "llama3-8b-8192";
            readonly promptCpm: 0.05;
            readonly completionCpm: 0.08;
        }, {
            readonly id: "llama3-groq-70b-8192-tool-use-preview";
            readonly promptCpm: 0.89;
            readonly completionCpm: 0.89;
        }, {
            readonly id: "llama3-groq-8b-8192-tool-use-preview";
            readonly promptCpm: 0.19;
            readonly completionCpm: 0.19;
        }, {
            readonly id: "mixtral-8x7b-32768";
            readonly promptCpm: 0.24;
            readonly completionCpm: 0.24;
        }];
    };
    readonly openai: {
        readonly models: readonly [{
            readonly id: "gpt-4o";
            readonly promptCpm: 5;
            readonly completionCpm: 15;
        }, {
            readonly id: "gpt-4o-2024-08-06";
            readonly promptCpm: 2.5;
            readonly completionCpm: 10;
        }, {
            readonly id: "gpt-4o-2024-05-13";
            readonly promptCpm: 5;
            readonly completionCpm: 15;
        }, {
            readonly id: "gpt-4o-mini";
            readonly promptCpm: 0.15;
            readonly completionCpm: 0.6;
        }, {
            readonly id: "gpt-4o-mini-2024-07-18";
            readonly promptCpm: 0.15;
            readonly completionCpm: 0.6;
        }, {
            readonly id: "gpt-4-turbo";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4-turbo-2024-04-09";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4";
            readonly promptCpm: 30;
            readonly completionCpm: 60;
        }, {
            readonly id: "gpt-4-32k";
            readonly promptCpm: 60;
            readonly completionCpm: 120;
        }, {
            readonly id: "gpt-4-0125-preview";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4-1106-preview";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-4-vision-preview";
            readonly promptCpm: 10;
            readonly completionCpm: 30;
        }, {
            readonly id: "gpt-3.5-turbo-0125";
            readonly promptCpm: 0.5;
            readonly completionCpm: 1.5;
        }, {
            readonly id: "gpt-3.5-turbo-instruct";
            readonly promptCpm: 1.5;
            readonly completionCpm: 2;
        }, {
            readonly id: "gpt-3.5-turbo-1106";
            readonly promptCpm: 1;
            readonly completionCpm: 2;
        }, {
            readonly id: "gpt-3.5-turbo-0613";
            readonly promptCpm: 1.5;
            readonly completionCpm: 2;
        }, {
            readonly id: "gpt-3.5-turbo-16k-0613";
            readonly promptCpm: 3;
            readonly completionCpm: 4;
        }, {
            readonly id: "gpt-3.5-turbo-0301";
            readonly promptCpm: 1.5;
            readonly completionCpm: 2;
        }];
    };
    readonly anthropic: {
        readonly models: readonly [{
            readonly id: "claude-3-5-sonnet-20240620";
            readonly promptCpm: 3;
            readonly completionCpm: 15;
        }, {
            readonly id: "claude-3-opus-20240229";
            readonly promptCpm: 15;
            readonly completionCpm: 75;
        }, {
            readonly id: "claude-3-sonnet-20240229";
            readonly promptCpm: 3;
            readonly completionCpm: 15;
        }, {
            readonly id: "claude-3-haiku-20240307";
            readonly promptCpm: 0.25;
            readonly completionCpm: 1.25;
        }];
    };
}[P]["models"][number]["id"]>(context: {
    provider: P;
    model: M;
} & Usage) => {
    prompt_cost: number;
    output_cost: number;
    total_cost: number;
} | undefined;
export declare const GET: (request: Request) => Promise<Response>;
//# sourceMappingURL=calculate-cost.d.ts.map