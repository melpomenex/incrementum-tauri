/**
 * AI Provider Settings Component
 * LLM Provider configuration and MCP Servers configuration
 */

import { SettingsSection } from "./SettingsPage";
import { LLMProviderSettings } from "./LLMProviderSettings";
import { MCPServersSettings } from "./MCPServersSettings";
import { useLLMProvidersStore } from "../../stores/llmProvidersStore";
import { useMCPServersStore } from "../../stores/mcpServersStore";
import { invokeCommand as invoke } from "../../lib/tauri";

/**
 * AI Provider Settings
 */
export function AISettings({ onChange }: { onChange: () => void }) {
  const providers = useLLMProvidersStore((state) => state.providers);
  const addProvider = useLLMProvidersStore((state) => state.addProvider);
  const updateProvider = useLLMProvidersStore((state) => state.updateProvider);
  const removeProvider = useLLMProvidersStore((state) => state.removeProvider);

  const mcpServers = useMCPServersStore((state) => state.servers);
  const addMCPServer = useMCPServersStore((state) => state.addServer);
  const removeMCPServer = useMCPServersStore((state) => state.removeServer);
  const updateMCPServer = useMCPServersStore((state) => state.updateServer);

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

  const handleTestMCPServer = async (server: { id: string; name: string; endpoint: string; transport: "stdio" | "sse" }) => {
    // TODO: Implement actual MCP server connection test
    // For now, just return true
    return true;
  };

  const handleAddProvider = (provider: Omit<{ id: string; provider: "openai" | "anthropic" | "ollama" | "openrouter"; name: string; apiKey: string; baseUrl?: string; model: string; enabled: boolean }, "id">) => {
    addProvider(provider);
    onChange();
  };

  const handleUpdateProvider = (id: string, updates: Partial<{ id: string; provider: "openai" | "anthropic" | "ollama" | "openrouter"; name: string; apiKey: string; baseUrl?: string; model: string; enabled: boolean }>) => {
    updateProvider(id, updates);
    onChange();
  };

  const handleRemoveProvider = (id: string) => {
    removeProvider(id);
    onChange();
  };

  const handleAddMCPServer = (server: Omit<{ id: string; name: string; endpoint: string; transport: "stdio" | "sse"; enabled?: boolean }, "id">) => {
    addMCPServer(server);
    onChange();
  };

  const handleRemoveMCPServer = (id: string) => {
    removeMCPServer(id);
    onChange();
  };

  const handleUpdateMCPServer = (id: string, updates: Partial<{ id: string; name: string; endpoint: string; transport: "stdio" | "sse"; enabled?: boolean }>) => {
    updateMCPServer(id, updates);
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

      {/* MCP Servers Configuration */}
      <MCPServersSettings
        servers={mcpServers}
        onAddServer={handleAddMCPServer}
        onRemoveServer={handleRemoveMCPServer}
        onUpdateServer={handleUpdateMCPServer}
        onTestServer={handleTestMCPServer}
        maxServers={3}
      />
    </>
  );
}
