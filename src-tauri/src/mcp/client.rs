// MCP Client - Connect to external MCP servers and use their tools
use super::types::*;
use serde_json::json;
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Configuration for an external MCP server connection
#[derive(Debug, Clone)]
pub struct MCPServerConnection {
    pub id: String,
    pub name: String,
    pub command: String,        // Command to run (for stdio)
    pub args: Vec<String>,       // Arguments for the command
    pub env: HashMap<String, String>, // Environment variables
    pub transport: MCPTransport,
}

#[derive(Debug, Clone)]
pub enum MCPTransport {
    Stdio,
    SSE(String), // URL for SSE endpoint
}

/// Client for interacting with an external MCP server
pub struct MCPClient {
    config: MCPServerConnection,
    child: Option<std::process::Child>,
    tools: Vec<ToolDefinition>,
    server_info: Option<MCPServerInfo>,
    capabilities: Option<MCPCapabilities>,
}

impl MCPClient {
    /// Create a new MCP client for the given server configuration
    pub fn new(config: MCPServerConnection) -> Self {
        Self {
            config,
            child: None,
            tools: Vec::new(),
            server_info: None,
            capabilities: None,
        }
    }

    /// Start the MCP server process and initialize
    pub async fn start(&mut self) -> Result<(), String> {
        match &self.config.transport {
            MCPTransport::Stdio => {
                self.start_stdio().await
            }
            MCPTransport::SSE(url) => {
                // SSE transport would be implemented here
                // For now, return an error as it's not yet implemented
                Err(format!("SSE transport not yet implemented: {}", url))
            }
        }
    }

    /// Start the MCP server using stdio transport
    async fn start_stdio(&mut self) -> Result<(), String> {
        // Spawn the MCP server process
        let mut child = Command::new(&self.config.command)
            .args(&self.config.args)
            .envs(&self.config.env)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start MCP server: {}", e))?;

        let stdin = child.stdin.as_mut().ok_or("Failed to open stdin")?;
        let stdout = child.stdout.as_mut().ok_or("Failed to open stdout")?;

        let mut reader = BufReader::new(stdout);
        let writer = stdin;

        // Send initialize request
        let init_request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: json!(1),
            method: "initialize".to_string(),
            params: Some(json!({
                "protocolVersion": "2025-06-18",
                "capabilities": {
                    "tools": {},
                    "resources": {},
                    "prompts": {}
                },
                "clientInfo": {
                    "name": "Incrementum",
                    "version": env!("CARGO_PKG_VERSION")
                }
            })),
        };

        writeln!(writer, "{}", serde_json::to_string(&init_request).unwrap())
            .map_err(|e| format!("Failed to send initialize request: {}", e))?;

        // Read response
        let mut line = String::new();
        reader.read_line(&mut line)
            .map_err(|e| format!("Failed to read initialize response: {}", e))?;

        let response: JsonRpcResponse = serde_json::from_str(line.trim())
            .map_err(|e| format!("Failed to parse initialize response: {}", e))?;

        if let Some(error) = response.error {
            return Err(format!("Initialize error: {}", error.message));
        }

        // Parse server info from result
        if let Some(result) = response.result {
            self.parse_initialize_result(result);
        }

        // Send initialized notification
        let initialized_notif = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: json!(null),
            method: "notifications/initialized".to_string(),
            params: None,
        };

        writeln!(writer, "{}", serde_json::to_string(&initialized_notif).unwrap())
            .map_err(|e| format!("Failed to send initialized notification: {}", e))?;

        // Discover tools
        self.discover_tools_stdio(&mut reader, writer).await?;

        self.child = Some(child);
        Ok(())
    }

    /// Parse the initialize result to extract server info and capabilities
    fn parse_initialize_result(&mut self, result: serde_json::Value) {
        // Extract server info
        if let Some(server_info) = result.get("serverInfo") {
            self.server_info = Some(MCPServerInfo {
                name: server_info["name"].as_str().unwrap_or("Unknown").to_string(),
                version: server_info["version"].as_str().unwrap_or("0.0.0").to_string(),
                protocol_version: result["protocolVersion"].as_str().unwrap_or("2025-06-18").to_string(),
            });
        }

        // Extract capabilities
        self.capabilities = result.get("capabilities")
            .and_then(|v| serde_json::from_value(v.clone()).ok());
    }

    /// Discover available tools from the MCP server
    async fn discover_tools_stdio(
        &mut self,
        reader: &mut BufReader<&mut std::process::ChildStdout>,
        writer: &mut std::process::ChildStdin,
    ) -> Result<(), String> {
        let tools_request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: json!(2),
            method: "tools/list".to_string(),
            params: None,
        };

        writeln!(writer, "{}", serde_json::to_string(&tools_request).unwrap())
            .map_err(|e| format!("Failed to send tools/list request: {}", e))?;

        let mut line = String::new();
        reader.read_line(&mut line)
            .map_err(|e| format!("Failed to read tools/list response: {}", e))?;

        let response: JsonRpcResponse = serde_json::from_str(line.trim())
            .map_err(|e| format!("Failed to parse tools/list response: {}", e))?;

        if let Some(error) = response.error {
            return Err(format!("Tools list error: {}", error.message));
        }

        // Parse tools from result
        if let Some(result) = response.result {
            if let Some(tools_array) = result.get("tools").and_then(|v| v.as_array()) {
                self.tools = tools_array
                    .iter()
                    .filter_map(|v| serde_json::from_value(v.clone()).ok())
                    .collect();
            }
        }

        Ok(())
    }

    /// Call a tool on the MCP server
    pub async fn call_tool(&mut self, name: &str, arguments: serde_json::Value) -> Result<ToolCallResult, String> {
        match &self.config.transport {
            MCPTransport::Stdio => {
                self.call_tool_stdio(name, arguments).await
            }
            MCPTransport::SSE(_) => {
                Err("SSE transport not yet implemented".to_string())
            }
        }
    }

    /// Call a tool using stdio transport
    async fn call_tool_stdio(
        &mut self,
        name: &str,
        arguments: serde_json::Value,
    ) -> Result<ToolCallResult, String> {
        let child = self.child.as_mut().ok_or("MCP server not running")?;
        let stdin = child.stdin.as_mut().ok_or("Failed to open stdin")?;
        let stdout = child.stdout.as_mut().ok_or("Failed to open stdout")?;

        let mut reader = BufReader::new(stdout);
        let writer = stdin;

        let request = JsonRpcRequest {
            jsonrpc: "2.0".to_string(),
            id: json!(3),
            method: "tools/call".to_string(),
            params: Some(json!({
                "name": name,
                "arguments": arguments
            })),
        };

        writeln!(writer, "{}", serde_json::to_string(&request).unwrap())
            .map_err(|e| format!("Failed to send tools/call request: {}", e))?;

        let mut line = String::new();
        reader.read_line(&mut line)
            .map_err(|e| format!("Failed to read tools/call response: {}", e))?;

        let response: JsonRpcResponse = serde_json::from_str(line.trim())
            .map_err(|e| format!("Failed to parse tools/call response: {}", e))?;

        if let Some(error) = response.error {
            return Err(format!("Tool call error: {}", error.message));
        }

        // Parse tool call result
        response.result
            .and_then(|v| serde_json::from_value(v).ok())
            .ok_or("Failed to parse tool call result".to_string())
    }

    /// Get the list of discovered tools
    pub fn get_tools(&self) -> &[ToolDefinition] {
        &self.tools
    }

    /// Get server info
    pub fn get_server_info(&self) -> Option<&MCPServerInfo> {
        self.server_info.as_ref()
    }

    /// Get capabilities
    pub fn get_capabilities(&self) -> Option<&MCPCapabilities> {
        self.capabilities.as_ref()
    }

    /// Get the connection ID
    pub fn id(&self) -> &str {
        &self.config.id
    }

    /// Get the connection name
    pub fn name(&self) -> &str {
        &self.config.name
    }

    /// Stop the MCP server process
    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            child.kill()
                .map_err(|e| format!("Failed to kill MCP server: {}", e))?;
        }
        Ok(())
    }
}

impl Drop for MCPClient {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

/// Manager for multiple MCP server connections
pub struct MCPClientManager {
    clients: Arc<RwLock<HashMap<String, Arc<tokio::sync::RwLock<MCPClient>>>>>,
}

impl MCPClientManager {
    pub fn new() -> Self {
        Self {
            clients: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Add and start a new MCP server connection
    pub async fn add_server(&self, config: MCPServerConnection) -> Result<(), String> {
        let mut client = MCPClient::new(config.clone());
        client.start().await?;

        let mut clients = self.clients.write().await;
        clients.insert(config.id, Arc::new(tokio::sync::RwLock::new(client)));
        Ok(())
    }

    /// Remove an MCP server connection
    pub async fn remove_server(&self, id: &str) -> Result<(), String> {
        let mut clients = self.clients.write().await;
        if let Some(client) = clients.remove(id) {
            let mut client = client.write().await;
            client.stop()?;
        }
        Ok(())
    }

    /// Get a list of all connected servers
    pub async fn list_servers(&self) -> Vec<MCPServerInfo> {
        let clients = self.clients.read().await;
        let mut servers = Vec::new();

        for client in clients.values() {
            let client = client.read().await;
            if let Some(info) = client.get_server_info() {
                servers.push(info.clone());
            }
        }

        servers
    }

    /// Get tools from all connected servers
    pub async fn get_all_tools(&self) -> Vec<(String, ToolDefinition)> {
        let clients = self.clients.read().await;
        let mut tools = Vec::new();

        for (id, client) in clients.iter() {
            let client = client.read().await;
            for tool in client.get_tools() {
                tools.push((id.clone(), tool.clone()));
            }
        }

        tools
    }

    /// Call a tool on a specific server
    pub async fn call_tool(
        &self,
        server_id: &str,
        tool_name: &str,
        arguments: serde_json::Value,
    ) -> Result<ToolCallResult, String> {
        let clients = self.clients.read().await;
        let client = clients.get(server_id)
            .ok_or(format!("Server '{}' not found", server_id))?;

        let mut client = client.write().await;
        client.call_tool(tool_name, arguments).await
    }

    /// Get tools from a specific server
    pub async fn get_server_tools(&self, server_id: &str) -> Result<Vec<ToolDefinition>, String> {
        let clients = self.clients.read().await;
        let client = clients.get(server_id)
            .ok_or(format!("Server '{}' not found", server_id))?;

        let client = client.read().await;
        Ok(client.get_tools().to_vec())
    }

    /// Get info about a specific server
    pub async fn get_server_info(&self, server_id: &str) -> Result<Option<MCPServerInfo>, String> {
        let clients = self.clients.read().await;
        let client = clients.get(server_id)
            .ok_or(format!("Server '{}' not found", server_id))?;

        let client = client.read().await;
        Ok(client.get_server_info().cloned())
    }
}

impl Default for MCPClientManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_connection_config() {
        let config = MCPServerConnection {
            id: "test-server".to_string(),
            name: "Test Server".to_string(),
            command: "node".to_string(),
            args: vec!["server.js".to_string()],
            env: HashMap::new(),
            transport: MCPTransport::Stdio,
        };

        assert_eq!(config.id, "test-server");
        assert_eq!(config.name, "Test Server");
    }

    #[test]
    fn test_manager_creation() {
        let manager = MCPClientManager::new();
        assert!(manager.list_servers().await.is_empty());
    }
}
