// MCP Types
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServerInfo {
    pub name: String,
    pub version: String,
    pub protocol_version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPCapabilities {
    pub tools: Option<ToolsCapability>,
    pub resources: Option<ResourcesCapability>,
    pub prompts: Option<PromptsCapability>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolsCapability {
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourcesCapability {
    pub subscribe: Option<bool>,
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptsCapability {
    pub list_changed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub name: String,
    pub arguments: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCallResult {
    pub content: Vec<ToolContent>,
    pub is_error: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolContent {
    pub r#type: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub name: String,
    pub endpoint: String,
    pub transport: String, // "stdio" or "sse"
}

// Implementation of MCP JSON-RPC error codes
impl JsonRpcError {
    pub fn parse_error() -> Self {
        JsonRpcError {
            code: -32700,
            message: "Parse error".to_string(),
            data: None,
        }
    }

    pub fn invalid_request() -> Self {
        JsonRpcError {
            code: -32600,
            message: "Invalid Request".to_string(),
            data: None,
        }
    }

    pub fn method_not_found() -> Self {
        JsonRpcError {
            code: -32601,
            message: "Method not found".to_string(),
            data: None,
        }
    }

    pub fn invalid_params() -> Self {
        JsonRpcError {
            code: -32602,
            message: "Invalid params".to_string(),
            data: None,
        }
    }

    pub fn internal_error(message: &str) -> Self {
        JsonRpcError {
            code: -32603,
            message: format!("Internal error: {}", message),
            data: None,
        }
    }
}
