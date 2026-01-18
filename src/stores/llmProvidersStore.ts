import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '../utils/id';

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
          id: generateId(),
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
          hasApiKey: p.apiKey ? p.apiKey.trim().length > 0 : false,
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
      // Clean up providers with empty API keys on hydration using merge
      // This prevents infinite loops caused by mutating state in onRehydrateStorage
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<LLMProvidersState> | undefined;
        if (!persisted || !persisted.providers) {
          return currentState;
        }
        // Remove providers with empty API keys (except ollama which doesn't require one)
        const cleanedProviders = persisted.providers.filter((p) =>
          p.provider === 'ollama' || (p.apiKey ? p.apiKey.trim().length > 0 : false)
        );
        const removed = persisted.providers.length - cleanedProviders.length;
        if (removed > 0) {
          console.log(`Cleaned up ${removed} provider(s) with empty API keys`);
        }
        return {
          ...currentState,
          providers: cleanedProviders,
        };
      },
    }
  )
);
