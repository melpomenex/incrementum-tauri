/**
 * LLM Provider Settings
 * Configure API keys and model preferences
 */
import { useState } from "react";
import { Key, Eye, EyeOff, Trash2, Plus, Check, Loader2, RefreshCw } from "lucide-react";
import { getAvailableModels } from "../../api/llm";

export interface LLMProviderConfig {
  id: string;
  provider: "openai" | "anthropic" | "ollama" | "openrouter";
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

interface LLMProviderSettingsProps {
  providers: LLMProviderConfig[];
  onAddProvider: (provider: Omit<LLMProviderConfig, "id">) => void;
  onUpdateProvider: (id: string, updates: Partial<LLMProviderConfig>) => void;
  onRemoveProvider: (id: string) => void;
  onTestConnection: (config: LLMProviderConfig) => Promise<boolean>;
}

const PROVIDER_INFO = {
  openai: {
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, GPT-4-turbo",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    icon: "🤖",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  anthropic: {
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3.5 Haiku",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-3-5-sonnet-20241022",
    icon: "🧠",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
  },
  ollama: {
    name: "Ollama",
    description: "Local LLM models (Llama, Mistral, etc.)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    icon: "💻",
    models: ["llama3.2", "mistral", "codellama", "phi3", "deepseek-coder"],
  },
  openrouter: {
    name: "OpenRouter",
    description: "Unified API for 100+ LLM providers",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    icon: "🔀",
    models: [
      "anthropic/claude-3.5-sonnet",
      "anthropic/claude-3.5-sonnet:beta",
      "anthropic/claude-3.5-haiku",
      "anthropic/claude-3-opus",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-4-turbo",
      "google/gemini-pro-1.5",
      "meta-llama/llama-3.1-405b-instruct",
      "deepseek/deepseek-chat",
    ],
  },
};

export function LLMProviderSettings({
  providers,
  onAddProvider,
  onUpdateProvider,
  onRemoveProvider,
  onTestConnection,
}: LLMProviderSettingsProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProviderType, setNewProviderType] = useState<"openai" | "anthropic" | "ollama" | "openrouter">("openai");
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState("");
  const [newProviderModel, setNewProviderModel] = useState("");
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({});
  const [refreshingModels, setRefreshingModels] = useState(false);

  const handleAddProvider = () => {
    if (!newProviderName.trim() || !newProviderApiKey.trim()) {
      return;
    }

    const info = PROVIDER_INFO[newProviderType];

    onAddProvider({
      provider: newProviderType,
      name: newProviderName || info.name,
      apiKey: newProviderApiKey,
      baseUrl: newProviderBaseUrl || info.baseUrl,
      model: newProviderModel || info.defaultModel,
      enabled: true,
    });

    // Reset form
    setNewProviderName("");
    setNewProviderApiKey("");
    setNewProviderBaseUrl("");
    setNewProviderModel("");
    setShowAddForm(false);
  };

  const handleTestConnection = async (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    setTestingConnection(providerId);
    try {
      const success = await onTestConnection(provider);
      setTestResults({ ...testResults, [providerId]: success });
    } catch (error) {
      setTestResults({ ...testResults, [providerId]: false });
    } finally {
      setTestingConnection(null);
    }
  };

  const toggleKeyVisibility = (providerId: string) => {
    setVisibleKeys({ ...visibleKeys, [providerId]: !visibleKeys[providerId] });
  };

  const handleRefreshModels = async () => {
    if (newProviderType !== "openrouter") return;
    if (!newProviderApiKey.trim()) {
      alert("Please enter an API key first to fetch models from OpenRouter");
      return;
    }

    setRefreshingModels(true);
    try {
      const models = await getAvailableModels(
        newProviderType,
        newProviderApiKey,
        newProviderBaseUrl || PROVIDER_INFO[newProviderType].baseUrl
      );
      if (!models || !Array.isArray(models)) {
        throw new Error("Failed to fetch models - invalid response");
      }
      setDynamicModels({ ...dynamicModels, [newProviderType]: models });
      // Set the first model as default if current model is not in the list
      if (models.length > 0 && !models.includes(newProviderModel)) {
        setNewProviderModel(models[0]);
      }
    } catch (error) {
      console.error("Failed to fetch models from OpenRouter:", error);
      alert(`Failed to fetch models from OpenRouter: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setRefreshingModels(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Configured Providers</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Provider
          </button>
        </div>

        {providers.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-lg border-2 border-dashed border-muted-foreground">
            <Key className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No API keys configured yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add your OpenAI, Anthropic, Ollama, or OpenRouter API keys to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => {
              const info = PROVIDER_INFO[provider.provider];
              const isVisible = visibleKeys[provider.id];
              const testResult = testResults[provider.id];

              return (
                <div
                  key={provider.id}
                  className={`p-4 bg-card border rounded-lg ${
                    !provider.enabled ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{info.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">{provider.name}</h4>
                          {!provider.enabled && (
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                              Disabled
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{info.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Model: <span className="font-mono">{provider.model}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={testingConnection === provider.id}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title="Test connection"
                      >
                        {testingConnection === provider.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        ) : testResult === true ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : testResult === false ? (
                          <div className="w-4 h-4 text-red-500">×</div>
                        ) : (
                          <Loader2 className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      <button
                        onClick={() => onUpdateProvider(provider.id, { enabled: !provider.enabled })}
                        className="p-2 hover:bg-muted rounded transition-colors"
                        title={provider.enabled ? "Disable" : "Enable"}
                      >
                        {provider.enabled ? "⏸" : "▶️"}
                      </button>

                      <button
                        onClick={() => onRemoveProvider(provider.id)}
                        className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                        title="Remove provider"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="mt-4 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono">
                      {isVisible ? provider.apiKey : "••••••••••••••••••••••••••••••••"}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="p-2 hover:bg-muted rounded transition-colors"
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Base URL (if custom) */}
                  {provider.baseUrl && provider.baseUrl !== PROVIDER_INFO[provider.provider].baseUrl && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Base URL: {provider.baseUrl}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Provider Form */}
      {showAddForm && (
        <div className="p-4 bg-card border rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Add New Provider</h3>

          {/* Provider Type Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Provider Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(["openai", "anthropic", "ollama", "openrouter"] as const).map((type) => {
                const info = PROVIDER_INFO[type];
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setNewProviderType(type);
                      setNewProviderName(info.name);
                      setNewProviderBaseUrl(info.baseUrl);
                      setNewProviderModel(info.defaultModel);
                      // Clear API key when switching provider types for security
                      setNewProviderApiKey("");
                    }}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      newProviderType === type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="text-2xl mb-2">{info.icon}</div>
                    <div className="font-medium text-foreground">{info.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{info.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Name
            </label>
            <input
              type="text"
              value={newProviderName}
              onChange={(e) => setNewProviderName(e.target.value)}
              placeholder="Custom name for this provider"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                type={visibleKeys[newProviderType] ? "text" : "password"}
                value={newProviderApiKey}
                onChange={(e) => setNewProviderApiKey(e.target.value)}
                placeholder={newProviderType === "ollama" ? "Optional for local Ollama" : "sk-..."}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-mono text-sm"
              />
            </div>
          </div>

          {/* Base URL (optional) - show for all providers except OpenAI */}
          {newProviderType !== "openai" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Base URL (Optional)
              </label>
              <input
                type="url"
                value={newProviderBaseUrl}
                onChange={(e) => setNewProviderBaseUrl(e.target.value)}
                placeholder={PROVIDER_INFO[newProviderType].baseUrl}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default: {PROVIDER_INFO[newProviderType].baseUrl}
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground">
                Model
              </label>
              {newProviderType === "openrouter" && (
                <button
                  onClick={handleRefreshModels}
                  disabled={refreshingModels || !newProviderApiKey.trim()}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Fetch latest models from OpenRouter"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshingModels ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              )}
            </div>
            <select
              value={newProviderModel}
              onChange={(e) => setNewProviderModel(e.target.value)}
              disabled={refreshingModels}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground disabled:opacity-50"
            >
              {(dynamicModels[newProviderType] || PROVIDER_INFO[newProviderType].models).map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
            {newProviderType === "openrouter" && dynamicModels[newProviderType] && (
              <p className="text-xs text-muted-foreground mt-1">
                {dynamicModels[newProviderType]!.length} models available from OpenRouter
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewProviderName("");
                setNewProviderApiKey("");
                setNewProviderBaseUrl("");
                setNewProviderModel("");
              }}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddProvider}
              disabled={!newProviderName || !newProviderApiKey}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Provider
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
