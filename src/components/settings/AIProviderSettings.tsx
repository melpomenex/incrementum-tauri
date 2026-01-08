/**
 * AI Provider Settings Component
 * LLM Provider configuration and MCP Servers configuration
 */

import { SettingsSection } from "./SettingsPage";
import { LLMProviderSettings } from "./LLMProviderSettings";
import { useLLMProvidersStore } from "../../stores/llmProvidersStore";
import { invoke } from "@tauri-apps/api/core";

/**
 * AI Provider Settings
 */
export function AISettings({ onChange }: { onChange: () => void }) {
  const providers = useLLMProvidersStore((state) => state.providers);
  const addProvider = useLLMProvidersStore((state) => state.addProvider);
  const updateProvider = useLLMProvidersStore((state) => state.updateProvider);
  const removeProvider = useLLMProvidersStore((state) => state.removeProvider);

  const handleTestConnection = async (config: { id: string; provider: string; apiKey: string; baseUrl?: string; model: string }) => {
    try {
      const result = await invoke<boolean>("llm_test_connection", {
        provider: config.provider,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      });
      return result;
    } catch (error) {
      console.error("Failed to test connection:", error);
      return false;
    }
  };

  const handleAddProvider = (provider: Omit<{ id: string; provider: "openai" | "anthropic" | "ollama"; name: string; apiKey: string; baseUrl?: string; model: string; enabled: boolean }, "id">) => {
    addProvider(provider);
    onChange();
  };

  const handleUpdateProvider = (id: string, updates: Partial<{ id: string; provider: "openai" | "anthropic" | "ollama"; name: string; apiKey: string; baseUrl?: string; model: string; enabled: boolean }>) => {
    updateProvider(id, updates);
    onChange();
  };

  const handleRemoveProvider = (id: string) => {
    removeProvider(id);
    onChange();
  };

  return (
    <>
      <LLMProviderSettings
        providers={providers}
        onAddProvider={handleAddProvider}
        onUpdateProvider={handleUpdateProvider}
        onRemoveProvider={handleRemoveProvider}
        onTestConnection={handleTestConnection}
      />

      {/* MCP Servers Configuration - TODO: Add MCPServerSettings component */}
      <SettingsSection
        title="MCP Servers"
        description="Configure external MCP servers (up to 3)"
      >
        <div className="text-center py-12 text-muted-foreground">
          <p>MCP servers configuration coming soon</p>
          <p className="text-sm mt-2">You'll be able to add up to 3 external MCP servers here</p>
        </div>
      </SettingsSection>
    </>
  );
}
