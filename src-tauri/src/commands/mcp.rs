//! MCP Commands for Tauri
use crate::mcp::*;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Manager;

// Global MCP client manager
lazy_static::lazy_static! {
    static ref MCP_MANAGER: Arc<MCPClientManager> = Arc::new(MCPClientManager::new());
}

/// Add and connect to an external MCP server
#[tauri::command]
pub async fn mcp_add_server(
    id: String,
    name: String,
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
    transport: String,
    transport_url: Option<String>,
) -> Result<String, String> {
    // Determine transport type
    let mcp_transport = match transport.as_str() {
        "stdio" => MCPTransport::Stdio,
        "sse" => {
            let url = transport_url.ok_or("transport_url is required for SSE transport")?;
            MCPTransport::SSE(url)
        }
        _ => return Err(format!("Unknown transport type: {}", transport)),
    };

    let config = MCPServerConnection {
        id: id.clone(),
        name,
        command,
        args,
        env,
        transport: mcp_transport,
    };

    MCP_MANAGER.add_server(config).await?;
    Ok(id)
}

/// Remove and disconnect an MCP server
#[tauri::command]
pub async fn mcp_remove_server(id: String) -> Result<(), String> {
    MCP_MANAGER.remove_server(&id).await
}

/// List all connected MCP servers
#[tauri::command]
pub async fn mcp_list_servers() -> Result<Vec<MCPServerInfo>, String> {
    Ok(MCP_MANAGER.list_servers().await)
}

/// Get tools from all connected MCP servers
#[tauri::command]
pub async fn mcp_list_tools() -> Result<Vec<ToolDefinitionResponse>, String> {
    let tools = MCP_MANAGER.get_all_tools().await;
    Ok(tools
        .into_iter()
        .map(|(server_id, tool)| ToolDefinitionResponse {
            name: tool.name,
            description: format!("{} (from {})", tool.description, server_id),
            input_schema: tool.input_schema,
        })
        .collect())
}

/// Get tools from a specific MCP server
#[tauri::command]
pub async fn mcp_get_server_tools(id: String) -> Result<Vec<ToolDefinitionResponse>, String> {
    let tools = MCP_MANAGER.get_server_tools(&id).await?;
    Ok(tools
        .into_iter()
        .map(|tool| ToolDefinitionResponse {
            name: tool.name,
            description: tool.description,
            input_schema: tool.input_schema,
        })
        .collect())
}

/// Get info about a specific MCP server
#[tauri::command]
pub async fn mcp_get_server_info(id: String) -> Result<Option<MCPServerInfo>, String> {
    MCP_MANAGER.get_server_info(&id).await
}

/// Call a tool on a specific MCP server
#[tauri::command]
pub async fn mcp_call_tool(
    server_id: String,
    tool_name: String,
    arguments: serde_json::Value,
) -> Result<ToolCallResultResponse, String> {
    let result = MCP_MANAGER.call_tool(&server_id, &tool_name, arguments).await?;

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

/// Update an MCP server configuration
#[tauri::command]
pub async fn mcp_update_server(
    id: String,
    _updates: ServerConfigUpdate,
) -> Result<(), String> {
    // Remove the existing server
    MCP_MANAGER.remove_server(&id).await?;

    // Re-add with updated configuration
    // Note: In a real implementation, you'd persist these changes to the database
    // For now, this is a no-op as the configuration isn't stored
    Ok(())
}

/// Get Incrementum's built-in MCP tools
#[tauri::command]
pub async fn mcp_get_incrementum_tools() -> Result<Vec<ToolDefinitionResponse>, String> {
    // This would require access to a Repository to create a proper MCPToolRegistry
    // For now, return the tool definitions without executing them
    Ok(vec![
        ToolDefinitionResponse {
            name: "create_document".to_string(),
            description: "Create a new document in Incrementum".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Document title"},
                    "content": {"type": "string", "description": "Document content"},
                    "file_path": {"type": "string", "description": "File path"},
                    "file_type": {"type": "string", "description": "File type (pdf, epub, md, etc.)"}
                },
                "required": ["title"]
            }),
        },
        ToolDefinitionResponse {
            name: "get_document".to_string(),
            description: "Retrieve details of a specific document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string", "description": "Document ID"}
                },
                "required": ["document_id"]
            }),
        },
        ToolDefinitionResponse {
            name: "search_documents".to_string(),
            description: "Search documents by content or metadata".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "number", "description": "Maximum results"}
                },
                "required": ["query"]
            }),
        },
        ToolDefinitionResponse {
            name: "update_document".to_string(),
            description: "Update document metadata".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"},
                    "title": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["document_id"]
            }),
        },
        ToolDefinitionResponse {
            name: "delete_document".to_string(),
            description: "Delete a document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"}
                },
                "required": ["document_id"]
            }),
        },
        ToolDefinitionResponse {
            name: "create_cloze_card".to_string(),
            description: "Create a cloze deletion flashcard".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text with cloze deletions"},
                    "document_id": {"type": "string", "description": "Associated document ID"}
                },
                "required": ["text"]
            }),
        },
        ToolDefinitionResponse {
            name: "create_qa_card".to_string(),
            description: "Create a question-answer flashcard".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "answer": {"type": "string"},
                    "document_id": {"type": "string"}
                },
                "required": ["question", "answer"]
            }),
        },
        ToolDefinitionResponse {
            name: "create_extract".to_string(),
            description: "Create an extract or note from content".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "content": {"type": "string", "description": "Extract content"},
                    "document_id": {"type": "string", "description": "Source document ID"},
                    "note": {"type": "string", "description": "Additional notes"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "color": {"type": "string", "description": "Highlight color"}
                },
                "required": ["content", "document_id"]
            }),
        },
        ToolDefinitionResponse {
            name: "get_learning_items".to_string(),
            description: "Get learning items for a document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"},
                    "item_type": {"type": "string", "enum": ["flashcard", "cloze", "qa", "basic"]}
                },
                "required": ["document_id"]
            }),
        },
        ToolDefinitionResponse {
            name: "get_document_extracts".to_string(),
            description: "Get all extracts for a document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"}
                },
                "required": ["document_id"]
            }),
        },
        ToolDefinitionResponse {
            name: "get_review_queue".to_string(),
            description: "Get items due for review".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "limit": {"type": "number", "description": "Maximum items"}
                }
            }),
        },
        ToolDefinitionResponse {
            name: "submit_review".to_string(),
            description: "Submit a review result".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "item_id": {"type": "string"},
                    "rating": {"type": "number", "minimum": 1, "maximum": 4}
                },
                "required": ["item_id", "rating"]
            }),
        },
        ToolDefinitionResponse {
            name: "rate_document".to_string(),
            description: "Rate a document and schedule its next review using FSRS".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"},
                    "rating": {"type": "number", "minimum": 1, "maximum": 4, "description": "FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy"},
                    "time_taken": {"type": "number", "description": "Time spent in seconds (optional)"}
                },
                "required": ["document_id", "rating"]
            }),
        },
        ToolDefinitionResponse {
            name: "rate_extract".to_string(),
            description: "Rate an extract and schedule its next review using FSRS".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "extract_id": {"type": "string"},
                    "rating": {"type": "number", "minimum": 1, "maximum": 4, "description": "FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy"},
                    "time_taken": {"type": "number", "description": "Time spent in seconds (optional)"}
                },
                "required": ["extract_id", "rating"]
            }),
        },
        ToolDefinitionResponse {
            name: "get_statistics".to_string(),
            description: "Get learning statistics".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        },
        ToolDefinitionResponse {
            name: "add_pdf_selection".to_string(),
            description: "Create notes from PDF text selection".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"},
                    "page_number": {"type": "number"},
                    "selection": {"type": "string"}
                },
                "required": ["document_id", "page_number", "selection"]
            }),
        },
        ToolDefinitionResponse {
            name: "batch_create_cards".to_string(),
            description: "Create multiple flashcards at once".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string", "description": "Optional document ID to associate all cards"},
                    "cards": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "question": {"type": "string"},
                                "answer": {"type": "string"},
                                "type": {"type": "string"}
                            }
                        }
                    }
                },
                "required": ["cards"]
            }),
        },
        ToolDefinitionResponse {
            name: "get_queue_documents".to_string(),
            description: "Get next N documents from reading queue".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "count": {"type": "number", "description": "Number of documents to retrieve"}
                },
                "required": ["count"]
            }),
        },
    ])
}

/// Call Incrementum's built-in MCP tool
#[tauri::command]
pub async fn mcp_call_incrementum_tool(
    tool_name: String,
    arguments: serde_json::Value,
    app: tauri::AppHandle,
) -> Result<ToolCallResultResponse, String> {
    // Get the repository from the app state
    let state = app.state::<crate::AppState>();
    let pool = {
        let db_guard = state
            .db
            .lock()
            .map_err(|_| "Failed to lock app state".to_string())?;
        let db = db_guard
            .as_ref()
            .ok_or_else(|| "Database not initialized".to_string())?;
        db.pool().clone()
    };
    let repository = crate::database::Repository::new(pool);

    // Create tool registry with repository
    let registry = MCPToolRegistry::new(std::sync::Arc::new(repository));
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

// Response types for Tauri commands

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
