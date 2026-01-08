import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LLMProviderConfig {
  id: string;
  provider: 'openai' | 'anthropic' | 'ollama';
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
  getProvidersByType: (type: 'openai' | 'anthropic' | 'ollama') => LLMProviderConfig[];
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
        return get().providers.filter((p) => p.enabled);
      },

      getProvidersByType: (type) => {
        return get().providers.filter((p) => p.provider === type);
      },
    }),
    {
      name: 'llm-providers-storage',
      // Don't persist API keys in plain text - they should be encrypted
      // For now, we'll skip persisting apiKey
      partialize: (state) => ({
        providers: state.providers.map((p) => ({
          ...p,
          apiKey: '', // Don't persist API keys
        })),
      }),
    }
  )
);
