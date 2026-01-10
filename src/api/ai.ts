import { invokeCommand } from "../lib/tauri";

/**
 * AI Provider types
 */
export enum LLMProviderType {
  OpenAI = "OpenAI",
  Anthropic = "Anthropic",
  OpenRouter = "OpenRouter",
  Ollama = "Ollama",
}

/**
 * AI Configuration
 */
export interface AIConfig {
  default_provider: LLMProviderType;
  api_keys: APIKeys;
  models: ModelPreferences;
  local_settings: LocalSettings;
}

/**
 * API Keys for different providers
 */
export interface APIKeys {
  openai?: string;
  anthropic?: string;
  openrouter?: string;
}

/**
 * Model preferences
 */
export interface ModelPreferences {
  openai_model: string;
  anthropic_model: string;
  openrouter_model: string;
  ollama_model: string;
  temperature: number;
  max_tokens: number;
}

/**
 * Local LLM settings
 */
export interface LocalSettings {
  ollama_base_url: string;
  timeout_secs: number;
}

/**
 * Generated flashcard
 */
export interface GeneratedFlashcard {
  question: string;
  answer: string;
  card_type: string;
  tags: string[];
}

/**
 * Flashcard generation options
 */
export interface FlashcardGenerationOptions {
  count: number;
  include_cloze: boolean;
  include_qa: boolean;
  difficulty?: number;
}

/**
 * Simplification levels
 */
export type SimplificationLevel = "elementary" | "highschool" | "college" | "expert";

/**
 * Get AI configuration
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  return await invokeCommand<AIConfig | null>("get_ai_config");
}

/**
 * Set AI configuration
 */
export async function setAIConfig(config: AIConfig): Promise<void> {
  return await invokeCommand("set_ai_config", { config });
}

/**
 * Set API key for a provider
 */
export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  return await invokeCommand("set_api_key", { provider, apiKey });
}

/**
 * Generate flashcards from an extract
 */
export async function generateFlashcardsFromExtract(
  extractId: string,
  options: FlashcardGenerationOptions
): Promise<GeneratedFlashcard[]> {
  return await invokeCommand<GeneratedFlashcard[]>("generate_flashcards_from_extract", {
    extractId,
    options,
  });
}

/**
 * Generate flashcards from content
 */
export async function generateFlashcardsFromContent(
  content: string,
  count: number
): Promise<GeneratedFlashcard[]> {
  return await invokeCommand<GeneratedFlashcard[]>("generate_flashcards_from_content", {
    content,
    count,
  });
}

/**
 * Answer a question with document context
 */
export async function answerQuestion(
  question: string,
  context: string
): Promise<string> {
  return await invokeCommand<string>("answer_question", { question, context });
}

/**
 * Answer a question about an extract
 */
export async function answerAboutExtract(
  extractId: string,
  question: string
): Promise<string> {
  return await invokeCommand<string>("answer_about_extract", { extractId, question });
}

/**
 * Summarize content
 */
export async function summarizeContent(
  content: string,
  maxWords: number
): Promise<string> {
  return await invokeCommand<string>("summarize_content", { content, maxWords });
}

/**
 * Extract key points from content
 */
export async function extractKeyPoints(
  content: string,
  count: number
): Promise<string[]> {
  return await invokeCommand<string[]>("extract_key_points", { content, count });
}

/**
 * Generate title for content
 */
export async function generateTitle(content: string): Promise<string> {
  return await invokeCommand<string>("generate_title", { content });
}

/**
 * Simplify content
 */
export async function simplifyContent(
  content: string,
  level: SimplificationLevel
): Promise<string> {
  return await invokeCommand<string>("simplify_content", { content, level });
}

/**
 * Generate questions from content
 */
export async function generateQuestions(
  content: string,
  count: number
): Promise<string[]> {
  return await invokeCommand<string[]>("generate_questions", { content, count });
}

/**
 * List available Ollama models
 */
export async function listOllamaModels(baseUrl?: string): Promise<string[]> {
  return await invokeCommand<string[]>("list_ollama_models", { baseUrl });
}

/**
 * Test AI connection
 */
export async function testAIConnection(providerType: LLMProviderType): Promise<string> {
  return await invokeCommand<string>("test_ai_connection", { providerType });
}
