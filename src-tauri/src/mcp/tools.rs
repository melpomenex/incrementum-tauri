// MCP Tools Implementation
use serde_json::json;
use super::types::{ToolDefinition, ToolCallResult, ToolContent};
use std::collections::HashMap;

pub struct MCPToolRegistry {
    tools: HashMap<String, ToolDefinition>,
}

impl MCPToolRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            tools: HashMap::new(),
        };
        registry.register_default_tools();
        registry
    }

    fn register_default_tools(&mut self) {
        // Document Management Tools
        self.register_tool(ToolDefinition {
            name: "create_document".to_string(),
            description: "Create a new document in Incrementum".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Document title"},
                    "content": {"type": "string", "description": "Document content"},
                    "file_type": {"type": "string", "description": "File type (pdf, epub, md, etc.)"}
                },
                "required": ["title", "content"]
            }),
        });

        self.register_tool(ToolDefinition {
            name: "get_document".to_string(),
            description: "Retrieve details of a specific document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string", "description": "Document ID"}
                },
                "required": ["document_id"]
            }),
        });

        self.register_tool(ToolDefinition {
            name: "search_documents".to_string(),
            description: "Search documents by content or metadata".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "limit": {"type": "number", "description": "Maximum results (default: 10)"}
                },
                "required": ["query"]
            }),
        });

        self.register_tool(ToolDefinition {
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
        });

        self.register_tool(ToolDefinition {
            name: "delete_document".to_string(),
            description: "Delete a document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"}
                },
                "required": ["document_id"]
            }),
        });

        // Learning Items & Cards Tools
        self.register_tool(ToolDefinition {
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
        });

        self.register_tool(ToolDefinition {
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
        });

        self.register_tool(ToolDefinition {
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
                "required": ["content"]
            }),
        });

        self.register_tool(ToolDefinition {
            name: "get_learning_items".to_string(),
            description: "Get learning items for a document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"},
                    "item_type": {"type": "string", "enum": ["Flashcard", "Cloze", "Qa", "Basic"]}
                },
                "required": ["document_id"]
            }),
        });

        self.register_tool(ToolDefinition {
            name: "get_document_extracts".to_string(),
            description: "Get all extracts for a document".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "document_id": {"type": "string"}
                },
                "required": ["document_id"]
            }),
        });

        // Review & Learning Tools
        self.register_tool(ToolDefinition {
            name: "get_review_queue".to_string(),
            description: "Get items due for review".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "limit": {"type": "number", "description": "Maximum items to return"}
                }
            }),
        });

        self.register_tool(ToolDefinition {
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
        });

        self.register_tool(ToolDefinition {
            name: "get_statistics".to_string(),
            description: "Get learning statistics".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {}
            }),
        });

        // PDF Tools
        self.register_tool(ToolDefinition {
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
        });

        // Batch Operations
        self.register_tool(ToolDefinition {
            name: "batch_create_cards".to_string(),
            description: "Create multiple flashcards at once".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
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
        });

        self.register_tool(ToolDefinition {
            name: "get_queue_documents".to_string(),
            description: "Get next N documents from reading queue".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "count": {"type": "number", "description": "Number of documents to retrieve"}
                },
                "required": ["count"]
            }),
        });
    }

    pub fn register_tool(&mut self, tool: ToolDefinition) {
        self.tools.insert(tool.name.clone(), tool);
    }

    pub fn get_tools(&self) -> Vec<ToolDefinition> {
        self.tools.values().cloned().collect()
    }

    pub fn get_tool(&self, name: &str) -> Option<&ToolDefinition> {
        self.tools.get(name)
    }

    pub async fn execute_tool(&self, name: &str, arguments: serde_json::Value) -> Result<ToolCallResult, String> {
        let tool = self.get_tool(name)
            .ok_or(format!("Tool '{}' not found", name))?;

        match tool.name.as_str() {
            "create_document" => self.execute_create_document(arguments).await,
            "get_document" => self.execute_get_document(arguments).await,
            "search_documents" => self.execute_search_documents(arguments).await,
            "update_document" => self.execute_update_document(arguments).await,
            "delete_document" => self.execute_delete_document(arguments).await,
            "create_cloze_card" => self.execute_create_cloze_card(arguments).await,
            "create_qa_card" => self.execute_create_qa_card(arguments).await,
            "create_extract" => self.execute_create_extract(arguments).await,
            "get_learning_items" => self.execute_get_learning_items(arguments).await,
            "get_document_extracts" => self.execute_get_document_extracts(arguments).await,
            "get_review_queue" => self.execute_get_review_queue(arguments).await,
            "submit_review" => self.execute_submit_review(arguments).await,
            "get_statistics" => self.execute_get_statistics(arguments).await,
            "add_pdf_selection" => self.execute_add_pdf_selection(arguments).await,
            "batch_create_cards" => self.execute_batch_create_cards(arguments).await,
            "get_queue_documents" => self.execute_get_queue_documents(arguments).await,
            _ => Err(format!("Tool '{}' not implemented", name)),
        }
    }

    // Tool implementations (stubs for now - will be connected to actual database)
    async fn execute_create_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Created document: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_get_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Retrieved document: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_search_documents(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Search results for: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_update_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Updated document: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_delete_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Deleted document: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_create_cloze_card(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Created cloze card: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_create_qa_card(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Created Q&A card: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_create_extract(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Created extract: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_get_learning_items(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Learning items: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_get_document_extracts(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Document extracts: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_get_review_queue(&self, _args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: "Review queue: 0 items due".to_string(),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_submit_review(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Submitted review: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_get_statistics(&self, _args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: "Statistics: 0 documents, 0 cards, 0 reviews".to_string(),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_add_pdf_selection(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Added PDF selection: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_batch_create_cards(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Batch created cards: {}", args),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_get_queue_documents(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: format!("Queue documents: {}", args),
            }],
            is_error: Some(false),
        })
    }
}

impl Default for MCPToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}
