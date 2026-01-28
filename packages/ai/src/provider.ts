import { createWorkersAI } from 'workers-ai-provider';

// Define the environment interface expected by the provider
export interface AIEnv {
  AI: any;
}

/**
 * Creates and configures the AI provider instance.
 * This centralizes the provider logic, making it easy to swap models or providers.
 */
export const getAIProvider = (env: AIEnv) => {
  const workersAI = createWorkersAI({ binding: env.AI });
  
  return {
    // Default large model for complex reasoning
    largeModel: workersAI('@cf/meta/llama-3-8b-instruct'),
    
    // Smaller, faster model for simple tasks (if applicable in the future)
    fastModel: workersAI('@cf/meta/llama-3-8b-instruct'), 
    
    // Embedding model for vectorization
    embeddingModel: '@cf/baai/bge-base-en-v1.5',
  };
};
