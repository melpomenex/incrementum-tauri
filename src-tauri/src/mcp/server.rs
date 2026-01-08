// MCP Server Implementation
use super::types::*;
use super::tools::MCPToolRegistry;
use serde_json::json;
use std::io::{self, BufRead, BufReader, Write};

pub struct MCPServer {
    info: MCPServerInfo,
    capabilities: MCPCapabilities,
    tool_registry: MCPToolRegistry,
}

impl MCPServer {
    pub fn new() -> Self {
        Self {
            info: MCPServerInfo {
                name: "Incrementum".to_string(),
                version: env!("CARGO_PKG_VERSION").to_string(),
                protocol_version: "2025-06-18".to_string(),
            },
            capabilities: MCPCapabilities {
                tools: Some(ToolsCapability {
                    list_changed: Some(false),
                }),
                resources: None,
                prompts: None,
            },
            tool_registry: MCPToolRegistry::new(),
        }
    }

    /// Start the MCP server (stdin/stdout communication)
    pub fn start(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        let stdin = io::stdin();
        let stdout = io::stdout();
        let mut reader = BufReader::new(stdin);
        let mut writer = stdout.lock();

        // Server is now ready
        eprintln!("MCP Server started on stdin/stdout");

        // Process incoming JSON-RPC messages
        loop {
            let mut line = String::new();
            reader.read_line(&mut line)?;

            if line.trim().is_empty() {
                continue;
            }

            // Parse and handle the request
            let request: JsonRpcRequest = match serde_json::from_str(&line) {
                Ok(req) => req,
                Err(e) => {
                    let error_response = JsonRpcResponse {
                        jsonrpc: "2.0".to_string(),
                        id: serde_json::json!(null),
                        result: None,
                        error: Some(JsonRpcError::parse_error()),
                    };
                    writeln!(writer, "{}", serde_json::to_string(&error_response)?)?;
                    continue;
                }
            };

            let response = self.handle_request(&request);
            writeln!(writer, "{}", serde_json::to_string(&response)?)?;
            writer.flush()?;
        }
    }

    /// Handle an incoming JSON-RPC request
    fn handle_request(&mut self, request: &JsonRpcRequest) -> JsonRpcResponse {
        let result = match request.method.as_str() {
            "initialize" => self.handle_initialize(request.params.as_ref()),
            "ping" => self.handle_ping(),
            "tools/list" => self.handle_tools_list(),
            "tools/call" => self.handle_tools_call(request.params.as_ref()),
            _ => Err(JsonRpcError::method_not_found()),
        };

        match result {
            Ok(result_value) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id.clone(),
                result: Some(result_value),
                error: None,
            },
            Err(error) => JsonRpcResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id.clone(),
                result: None,
                error: Some(error),
            },
        }
    }

    /// Handle initialize request
    fn handle_initialize(&self, params: Option<&serde_json::Value>) -> Result<serde_json::Value, JsonRpcError> {
        Ok(json!({
            "protocolVersion": self.info.protocol_version,
            "capabilities": self.capabilities,
            "serverInfo": {
                "name": self.info.name,
                "version": self.info.version
            }
        }))
    }

    /// Handle ping request
    fn handle_ping(&self) -> Result<serde_json::Value, JsonRpcError> {
        Ok(json!({}))
    }

    /// Handle tools/list request
    fn handle_tools_list(&self) -> Result<serde_json::Value, JsonRpcError> {
        let tools = self.tool_registry.get_tools();
        Ok(json!({
            "tools": tools
        }))
    }

    /// Handle tools/call request
    fn handle_tools_call(&self, params: Option<&serde_json::Value>) -> Result<serde_json::Value, JsonRpcError> {
        let params = params.ok_or(JsonRpcError::invalid_params())?;
        let name = params["name"]
            .as_str()
            .ok_or(JsonRpcError::invalid_params())?;
        let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

        // Execute the tool
        let result = tokio::runtime::Runtime::new()
            .map_err(|e| JsonRpcError {
                code: -32603,
                message: e.to_string(),
                data: None,
            })?
            .block_on(self.tool_registry.execute_tool(name, arguments))
            .map_err(|e| JsonRpcError {
                code: -32603,
                message: e,
                data: None,
            })?;

        Ok(json!(result))
    }
}

impl Default for MCPServer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_server_initialization() {
        let server = MCPServer::new();
        assert_eq!(server.info.name, "Incrementum");
        assert_eq!(server.info.protocol_version, "2025-06-18");
    }

    #[test]
    fn test_tool_registry() {
        let registry = MCPToolRegistry::new();
        let tools = registry.get_tools();
        assert!(!tools.is_empty());
        assert!(tools.iter().any(|t| t.name == "create_document"));
    }

    #[test]
    fn test_handle_initialize() {
        let server = MCPServer::new();
        let result = server.handle_initialize(None);
        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response["protocolVersion"], "2025-06-18");
    }

    #[test]
    fn test_handle_ping() {
        let server = MCPServer::new();
        let result = server.handle_ping();
        assert!(result.is_ok());
    }

    #[test]
    fn test_tools_list() {
        let server = MCPServer::new();
        let result = server.handle_tools_list();
        assert!(result.is_ok());
        let response = result.unwrap();
        let tools = response["tools"].as_array().unwrap();
        assert!(!tools.is_empty());
    }
}
