import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  transport: 'stdio' | 'sse';
  enabled?: boolean;
}

interface MCPServersState {
  servers: MCPServerConfig[];
  addServer: (server: Omit<MCPServerConfig, 'id'>) => void;
  updateServer: (id: string, updates: Partial<MCPServerConfig>) => void;
  removeServer: (id: string) => void;
  getServer: (id: string) => MCPServerConfig | undefined;
  getEnabledServers: () => MCPServerConfig[];
  maxServers: number;
}

const MAX_SERVERS = 3;

export const useMCPServersStore = create<MCPServersState>()(
  persist(
    (set, get) => ({
      servers: [],
      maxServers: MAX_SERVERS,

      addServer: (server) => {
        const state = get();
        if (state.servers.length >= MAX_SERVERS) {
          throw new Error(`Maximum ${MAX_SERVERS} servers allowed`);
        }

        const newServer: MCPServerConfig = {
          ...server,
          id: crypto.randomUUID(),
        };
        set((state) => ({
          servers: [...state.servers, newServer],
        }));
      },

      updateServer: (id, updates) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      removeServer: (id) => {
        set((state) => ({
          servers: state.servers.filter((s) => s.id !== id),
        }));
      },

      getServer: (id) => {
        return get().servers.find((s) => s.id === id);
      },

      getEnabledServers: () => {
        return get().servers.filter((s) => s.enabled !== false);
      },
    }),
    {
      name: 'mcp-servers-storage',
    }
  )
);
