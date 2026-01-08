/**
 * MCP (Model Context Protocol) API
 * Manages MCP servers and tool execution
 */

import { invoke } from "@tauri-apps/api/core";

export interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  transport: "stdio" | "sse";
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
 * List all MCP servers
 */
export async function listMCPServers(): Promise<MCPServerConfig[]> {
  return await invoke<MCPServerConfig[]>("mcp_list_servers");
}

/**
 * Add an MCP server
 */
export async function addMCPServer(config: Omit<MCPServerConfig, "id">): Promise<void> {
  return await invoke("mcp_add_server", { config });
}

/**
 * Remove an MCP server
 */
export async function removeMCPServer(id: string): Promise<void> {
  return await invoke("mcp_remove_server", { id });
}

/**
 * Update an MCP server
 */
export async function updateMCPServer(
  id: string,
  updates: Partial<Omit<MCPServerConfig, "id">>
): Promise<void> {
  return await invoke("mcp_update_server", { id, updates });
}

/**
 * List available tools from all MCP servers
 */
export async function listMCPTools(): Promise<MCPTool[]> {
  return await invoke<MCPTool[]>("mcp_list_tools");
}

/**
 * Call an MCP tool
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
 * Get Incrementum's MCP tools
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
