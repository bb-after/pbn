declare module 'anthropic' {
  interface CompletionRequest {
    model: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }

  interface CompletionResponse {
    completion: string;
    stopReason?: string;
  }

  export default class Anthropic {
    constructor(options: { apiKey: string });
    completions: {
      create(request: CompletionRequest): Promise<CompletionResponse>;
    };
  }

  export const HUMAN_PROMPT: string;
}
