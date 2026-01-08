/**
 * MCP (Model Context Protocol) API
 * Manages MCP servers and tool execution
 */

import { invoke } from "@tauri-apps/api/core";

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  transport: "stdio" | "sse";
  transportUrl?: string;
  enabled: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPToolCallResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * List all connected MCP servers
 */
export async function listMCPServers(): Promise<MCPServerInfo[]> {
  return await invoke<MCPServerInfo[]>("mcp_list_servers");
}

/**
 * Add and connect to an MCP server
 */
export async function addMCPServer(config: MCPServerConfig): Promise<string> {
  return await invoke<string>("mcp_add_server", {
    id: config.id,
    name: config.name,
    command: config.command,
    args: config.args,
    env: config.env,
    transport: config.transport,
    transportUrl: config.transportUrl,
  });
}

/**
 * Remove an MCP server
 */
export async function removeMCPServer(id: string): Promise<void> {
  return await invoke("mcp_remove_server", { id });
}

/**
 * Update an MCP server configuration
 */
export async function updateMCPServer(
  id: string,
  updates: Partial<Omit<MCPServerConfig, "id">>
): Promise<void> {
  return await invoke("mcp_update_server", { id, updates });
}

/**
 * List available tools from all connected MCP servers
 */
export async function listMCPTools(): Promise<MCPTool[]> {
  return await invoke<MCPTool[]>("mcp_list_tools");
}

/**
 * Get tools from a specific MCP server
 */
export async function getServerTools(id: string): Promise<MCPTool[]> {
  return await invoke<MCPTool[]>("mcp_get_server_tools", { id });
}

/**
 * Get info about a specific MCP server
 */
export async function getServerInfo(id: string): Promise<MCPServerInfo | null> {
  return await invoke<MCPServerInfo | null>("mcp_get_server_info", { id });
}

/**
 * Call a tool on a specific MCP server
 */
export async function callMCPTool(
  serverId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPToolCallResult> {
  return await invoke<MCPToolCallResult>("mcp_call_tool", {
    serverId,
    toolName,
    arguments: args,
  });
}

/**
 * Get Incrementum's built-in MCP tools
 */
export async function getIncrementumMCPTools(): Promise<MCPTool[]> {
  return await invoke<MCPTool[]>("mcp_get_incrementum_tools");
}

/**
 * Call an Incrementum MCP tool
 */
export async function callIncrementumMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<MCPToolCallResult> {
  return await invoke<MCPToolCallResult>("mcp_call_incrementum_tool", {
    toolName,
    arguments: args,
  });
}
