/**
 * LLM Provider Integration
 * Supports OpenAI, Anthropic, and local Ollama models
 */

import { invoke } from "@tauri-apps/api/core";

export type LLMProvider = "openai" | "anthropic" | "ollama";

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
  type: "document" | "web" | "general";
  documentId?: string;
  url?: string;
  selection?: string;
  content?: string;
}

/**
 * Chat with LLM
 */
export async function chatWithLLM(request: LLMRequest): Promise<LLMResponse> {
  return await invoke<LLMResponse>("llm_chat", {
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
 * Chat with LLM with context
 */
export async function chatWithContext(
  provider: LLMProvider,
  messages: LLMMessage[],
  context: LLMContext,
  apiKey?: string,
  baseUrl?: string
): Promise<LLMResponse> {
  return await invoke<LLMResponse>("llm_chat_with_context", {
    provider,
    messages,
    context: {
      type: context.type,
      documentId: context.documentId,
      url: context.url,
      selection: context.selection,
      content: context.content,
    },
    apiKey,
    baseUrl,
  });
}

/**
 * Stream chat with LLM
 */
export async function streamChatWithLLM(
  request: LLMRequest,
  onChunk: (chunk: string) => void
): Promise<LLMResponse> {
  return await invoke<LLMResponse>("llm_stream_chat", {
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
 * Get available models for a provider
 */
export async function getAvailableModels(provider: LLMProvider): Promise<string[]> {
  return await invoke<string[]>("llm_get_models", { provider });
}

/**
 * Test LLM connection
 */
export async function testLLMConnection(
  provider: LLMProvider,
  apiKey: string,
  baseUrl?: string
): Promise<boolean> {
  return await invoke<boolean>("llm_test_connection", {
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
};
