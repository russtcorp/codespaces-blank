import { SYSTEM_PROMPTS } from "./prompts";

export { SYSTEM_PROMPTS };
export * from "./types";
export * from "./twilio";

export interface AiClient {
  run(model: string, options: { prompt: string; messages?: any[] }): Promise<any>;
}

export function createAiClient(binding: any): AiClient {
  return {
    async run(model: string, options: { prompt: string; messages?: any[] }) {
      return binding.run(model, options);
    },
  };
}