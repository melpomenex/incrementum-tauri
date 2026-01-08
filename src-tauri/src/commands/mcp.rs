//! MCP Commands for Tauri
use crate::mcp::*;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[tauri::command]
pub async fn mcp_list_servers() -> Result<Vec<ServerConfig>, String> {
    // TODO: Load from database/settings
    Ok(vec![
        ServerConfig {
            name: "Incrementum".to_string(),
            endpoint: "stdio".to_string(),
            transport: "stdio".to_string(),
        },
    ])
}

#[tauri::command]
pub async fn mcp_add_server(config: ServerConfig) -> Result<(), String> {
    // TODO: Save to database/settings
    Ok(())
}

#[tauri::command]
pub async fn mcp_remove_server(id: String) -> Result<(), String> {
    // TODO: Remove from database/settings
    Ok(())
}

#[tauri::command]
pub async fn mcp_update_server(
    id: String,
    updates: ServerConfigUpdate,
) -> Result<(), String> {
    // TODO: Update in database/settings
    Ok(())
}

#[tauri::command]
pub async fn mcp_list_tools() -> Result<Vec<ToolDefinitionResponse>, String> {
    // TODO: Fetch tools from all configured external MCP servers
    Ok(vec![])
}

#[tauri::command]
pub async fn mcp_call_tool(
    server_id: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResultResponse, String> {
    // TODO: Call external MCP server tool
    Ok(ToolCallResultResponse {
        content: vec![],
        is_error: Some(false),
    })
}

#[tauri::command]
pub async fn mcp_get_incrementum_tools() -> Result<Vec<ToolDefinitionResponse>, String> {
    let registry = MCPToolRegistry::new();
    let tools = registry.get_tools();

    Ok(tools
        .into_iter()
        .map(|t| ToolDefinitionResponse {
            name: t.name,
            description: t.description,
            input_schema: t.input_schema,
        })
        .collect())
}

#[tauri::command]
pub async fn mcp_call_incrementum_tool(
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResultResponse, String> {
    let registry = MCPToolRegistry::new();
    let result = registry.execute_tool(&tool_name, arguments).await?;

    Ok(ToolCallResultResponse {
        content: result
            .content
            .into_iter()
            .map(|c| ToolContentResponse {
                r#type: c.r#type,
                text: c.text,
            })
            .collect(),
        is_error: result.is_error,
    })
}

#[derive(serde::Deserialize)]
pub struct ServerConfigUpdate {
    pub name: Option<String>,
    pub endpoint: Option<String>,
    pub transport: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinitionResponse {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolContentResponse {
    #[serde(rename = "type")]
    pub r#type: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallResultResponse {
    pub content: Vec<ToolContentResponse>,
    #[serde(rename = "isError")]
    pub is_error: Option<bool>,
}
