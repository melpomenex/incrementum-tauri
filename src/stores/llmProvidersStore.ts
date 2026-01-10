import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LLMProviderConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'ollama' | 'openrouter';
  name: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
  enabled: boolean;
}

interface LLMProvidersState {
  providers: LLMProviderConfig[];
  addProvider: (provider: Omit<LLMProviderConfig, 'id'>) => void;
  updateProvider: (id: string, updates: Partial<LLMProviderConfig>) => void;
  removeProvider: (id: string) => void;
  getProvider: (id: string) => LLMProviderConfig | undefined;
  getEnabledProviders: () => LLMProviderConfig[];
  getProvidersByType: (type: 'openai' | 'anthropic' | 'ollama' | 'openrouter') => LLMProviderConfig[];
}

export const useLLMProvidersStore = create<LLMProvidersState>()(
  persist(
    (set, get) => ({
      providers: [],

      addProvider: (provider) => {
        const newProvider: LLMProviderConfig = {
          ...provider,
          id: crypto.randomUUID(),
        };
        console.log("Adding provider:", { ...newProvider, apiKey: newProvider.apiKey ? "***" : "EMPTY" });
        set((state) => ({
          providers: [...state.providers, newProvider],
        }));
      },

      updateProvider: (id, updates) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      removeProvider: (id) => {
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
        }));
      },

      getProvider: (id) => {
        return get().providers.find((p) => p.id === id);
      },

      getEnabledProviders: () => {
        const enabled = get().providers.filter((p) => p.enabled);
        console.log("getEnabledProviders called:", enabled.map((p) => ({
          id: p.id,
          provider: p.provider,
          name: p.name,
          hasApiKey: !!p.apiKey && p.apiKey.trim().length > 0,
          enabled: p.enabled,
        })));
        return enabled;
      },

      getProvidersByType: (type) => {
        return get().providers.filter((p) => p.provider === type);
      },
    }),
    {
      name: 'llm-providers-storage',
      // Persist API keys in localStorage for now
      // TODO: Implement proper encryption or use system keychain
      partialize: (state) => ({
        providers: state.providers,
      }),
      // Clean up providers with empty API keys on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const before = state.providers.length;
          // Remove providers with empty API keys (except ollama which doesn't require one)
          state.providers = state.providers.filter((p) =>
            p.provider === 'ollama' || (p.apiKey && p.apiKey.trim().length > 0)
          );
          const after = state.providers.length;
          if (before !== after) {
            console.log(`Cleaned up ${before - after} provider(s) with empty API keys`);
          }
        }
      },
    }
  )
);
