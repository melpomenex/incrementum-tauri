/**
 * LLM Provider Integration
 * Supports OpenAI, Anthropic, and local Ollama models with streaming support
 */

import { invokeCommand, listen, type UnlistenFn } from "../../lib/tauri";

export type LLMProvider = "openai" | "anthropic" | "ollama" | "openrouter";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  provider: LLMProvider;
  model?: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMContext {
  type: "document" | "web" | "general" | "video";
  documentId?: string;
  url?: string;
  selection?: string;
  content?: string;
  contextWindowTokens?: number;
}

export interface StreamOptions {
  onChunk: (chunk: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

/**
 * Chat with LLM (non-streaming)
 */
export async function chatWithLLM(request: LLMRequest): Promise<LLMResponse> {
  return await invokeCommand<LLMResponse>("llm_chat", {
    provider: request.provider,
    model: request.model,
    messages: request.messages,
    temperature: request.temperature ?? 0.7,
    maxTokens: request.maxTokens ?? 2000,
    apiKey: request.apiKey,
    baseUrl: request.baseUrl,
  });
}

/**
 * Chat with LLM with context (non-streaming)
 */
export async function chatWithContext(
  provider: LLMProvider,
  model: string | undefined,
  messages: LLMMessage[],
  context: LLMContext,
  apiKey?: string,
  baseUrl?: string
): Promise<LLMResponse> {
  return await invokeCommand<LLMResponse>("llm_chat_with_context", {
    provider,
    model,
    messages,
    context: {
      type: context.type,
      documentId: context.documentId,
      url: context.url,
      selection: context.selection,
      content: context.content,
      contextWindowTokens: context.contextWindowTokens,
    },
    apiKey,
    baseUrl,
  });
}

/**
 * Stream chat with LLM
 * Returns a promise that resolves when streaming is complete
 */
export async function streamChatWithLLM(
  request: LLMRequest,
  options: StreamOptions
): Promise<void> {
  const unlisteners: UnlistenFn[] = [];

  try {
    // Set up event listeners
    const chunkUnlisten = await listen<{ content: string; done: boolean }>(
      "llm:stream:chunk",
      (event) => {
        options.onChunk(event.payload.content);
      }
    );
    unlisteners.push(chunkUnlisten);

    const doneUnlisten = await listen("llm:stream:done", () => {
      options.onDone?.();
    });
    unlisteners.push(doneUnlisten);

    const errorUnlisten = await listen<{ error: string }>(
      "llm:stream:error",
      (event) => {
        options.onError?.(event.payload.error);
      }
    );
    unlisteners.push(errorUnlisten);

    // Start the streaming
    await invokeCommand("llm_stream_chat", {
      provider: request.provider,
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      maxTokens: request.maxTokens ?? 2000,
      apiKey: request.apiKey,
      baseUrl: request.baseUrl,
    });
  } finally {
    // Clean up listeners after a delay to ensure all events are received
    setTimeout(() => {
      unlisteners.forEach((unlisten) => unlisten());
    }, 1000);
  }
}

/**
 * Get available models for a provider
 */
export async function getAvailableModels(
  provider: LLMProvider,
  apiKey?: string,
  baseUrl?: string
): Promise<string[]> {
  return await invokeCommand<string[]>("llm_get_models", {
    provider,
    apiKey,
    baseUrl,
  });
}

/**
 * Test LLM connection
 */
export async function testLLMConnection(
  provider: LLMProvider,
  apiKey: string,
  baseUrl?: string
): Promise<boolean> {
  return await invokeCommand<boolean>("llm_test_connection", {
    provider,
    apiKey,
    baseUrl,
  });
}

// Provider-specific configurations
export const PROVIDER_CONFIGS = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
  },
  ollama: {
    name: "Ollama",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    models: ["llama3.2", "mistral", "codellama", "phi3"],
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemma-2-9b-it:free",
    models: [
      "google/gemma-2-9b-it:free",
      "google/gemma-2-9b-it",
      "meta-llama/llama-3-8b-instruct:free",
      "meta-llama/llama-3-8b-instruct",
      "microsoft/phi-3-medium-128k-instruct:free",
      "microsoft/phi-3-mini-128k-instruct:free",
      "anthropic/claude-3.5-haiku",
      "anthropic/claude-3.5-sonnet:beta",
      "openai/gpt-4o-mini",
      "openai/gpt-4o",
      "deepseek/deepseek-chat",
    ],
  },
};
