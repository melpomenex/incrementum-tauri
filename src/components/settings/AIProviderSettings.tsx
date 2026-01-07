/**
 * AI Provider Settings Component
 */

import { useState } from "react";
import { SettingsSection, SettingsRow } from "./SettingsPage";

/**
 * AI Provider type
 */
type AIProvider = "openai" | "anthropic" | "openrouter" | "ollama" | "custom";

/**
 * AI Provider Settings
 */
export function AISettings({ onChange }: { onChange: () => void }) {
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gpt-4");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [showApiKey, setShowApiKey] = useState(false);

  const providers = [
    { id: "openai", name: "OpenAI", models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"] },
    { id: "anthropic", name: "Anthropic", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
    { id: "openrouter", name: "OpenRouter", models: ["anthropic/claude-3-opus", "openai/gpt-4"] },
    { id: "ollama", name: "Ollama (Local)", models: ["llama2", "mistral", "codellama"] },
    { id: "custom", name: "Custom", models: [] },
  ];

  const selectedProvider = providers.find((p) => p.id === provider);

  return (
    <>
      <SettingsSection
        title="AI Provider"
        description="Configure AI provider for flashcard generation and Q&A"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Provider"
            description="Select your AI provider"
          >
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as AIProvider);
                onChange();
              }}
              className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </SettingsRow>

          {provider !== "ollama" && (
            <SettingsRow
              label="API Key"
              description="Your API key for the selected provider"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      onChange();
                    }}
                    placeholder="sk-..."
                    className="w-64 px-3 py-2 pr-10 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  onClick={() => {
                    // Test API key
                    alert("API key test not implemented");
                  }}
                  className="px-3 py-2 bg-background border border-border rounded-md hover:bg-muted text-sm"
                >
                  Test
                </button>
              </div>
            </SettingsRow>
          )}

          {provider === "ollama" && (
            <SettingsRow
              label="Ollama URL"
              description="URL of your local Ollama instance"
            >
              <input
                type="text"
                defaultValue="http://localhost:11434"
                onChange={onChange}
                className="w-64 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </SettingsRow>
          )}

          {selectedProvider && selectedProvider.models.length > 0 && (
            <SettingsRow
              label="Model"
              description="Select the AI model to use"
            >
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  onChange();
                }}
                className="px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {selectedProvider.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </SettingsRow>
          )}

          {provider === "custom" && (
            <SettingsRow
              label="Custom Endpoint"
              description="Custom API endpoint URL"
            >
              <input
                type="text"
                placeholder="https://api.example.com/v1"
                onChange={onChange}
                className="w-64 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </SettingsRow>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Generation Settings"
        description="Configure AI generation behavior"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Temperature"
            description="Higher values make output more random (0-1)"
          >
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => {
                  setTemperature(parseFloat(e.target.value));
                  onChange();
                }}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground w-12">{temperature}</span>
            </div>
          </SettingsRow>

          <SettingsRow
            label="Max Tokens"
            description="Maximum tokens to generate"
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="100"
                max="32000"
                value={maxTokens}
                onChange={(e) => {
                  setMaxTokens(parseInt(e.target.value));
                  onChange();
                }}
                className="w-24 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </SettingsRow>

          <SettingsRow
            label="System Prompt"
            description="Custom system prompt for AI"
          >
            <textarea
              rows={3}
              placeholder="You are a helpful assistant..."
              onChange={onChange}
              className="w-64 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </SettingsRow>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Usage Tracking"
        description="Monitor AI API usage"
      >
        <div className="space-y-1">
          <SettingsRow
            label="Track Usage"
            description="Enable AI usage tracking and analytics"
          >
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" onChange={onChange} defaultChecked />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </SettingsRow>

          <SettingsRow
            label="Cost Limit"
            description="Monthly cost limit in USD (0 = unlimited)"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                onChange={onChange}
                className="w-20 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </SettingsRow>
        </div>
      </SettingsSection>
    </>
  );
}
