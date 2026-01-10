// MCP Tools Implementation
use serde_json::json;
use super::types::{ToolDefinition, ToolCallResult, ToolContent};
use std::collections::HashMap;
use std::sync::Arc;
use crate::database::Repository;
use crate::commands::review::apply_fsrs_review;
use crate::models::{Document, Extract, LearningItem, FileType, ItemType};
use uuid::Uuid;
use chrono::Utc;

pub struct MCPToolRegistry {
    tools: HashMap<String, ToolDefinition>,
    repository: Arc<Repository>,
}

impl MCPToolRegistry {
    pub fn new(repository: Arc<Repository>) -> Self {
        let mut registry = Self {
            tools: HashMap::new(),
            repository,
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
                    "file_path": {"type": "string", "description": "File path"},
                    "file_type": {"type": "string", "description": "File type (pdf, epub, md, etc.)"}
                },
                "required": ["title"]
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
                "required": ["content", "document_id"]
            }),
        });

        self.register_tool(ToolDefinition {
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
            description: "Submit a review result for learning items using FSRS".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "item_id": {"type": "string"},
                    "rating": {"type": "number", "minimum": 1, "maximum": 4, "description": "FSRS rating: 1=Again, 2=Hard, 3=Good, 4=Easy"}
                },
                "required": ["item_id", "rating"]
            }),
        });

        self.register_tool(ToolDefinition {
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
        });

        self.register_tool(ToolDefinition {
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
            "rate_document" => self.execute_rate_document(arguments).await,
            "rate_extract" => self.execute_rate_extract(arguments).await,
            "get_statistics" => self.execute_get_statistics(arguments).await,
            "add_pdf_selection" => self.execute_add_pdf_selection(arguments).await,
            "batch_create_cards" => self.execute_batch_create_cards(arguments).await,
            "get_queue_documents" => self.execute_get_queue_documents(arguments).await,
            _ => Err(format!("Tool '{}' not implemented", name)),
        }
    }

    // Helper: Parse file type string
    fn parse_file_type(s: &str) -> FileType {
        match s.to_lowercase().as_str() {
            "pdf" => FileType::Pdf,
            "epub" => FileType::Epub,
            "markdown" => FileType::Markdown,
            "html" => FileType::Html,
            _ => FileType::Other,
        }
    }

    // Document operations
    async fn execute_create_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let title = args["title"].as_str().ok_or("title is required")?;
        let content = args["content"].as_str();
        let file_path = args["file_path"].as_str().unwrap_or("");
        let file_type_str = args["file_type"].as_str().unwrap_or("other");
        let file_type = Self::parse_file_type(file_type_str);

        let mut doc = Document::new(title.to_string(), file_path.to_string(), file_type);
        if let Some(content) = content {
            doc.content = Some(content.to_string());
        }

        match self.repository.create_document(&doc).await {
            Ok(created) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "id": created.id,
                        "title": created.title,
                        "message": "Document created successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_get_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;

        match self.repository.get_document(document_id).await {
            Ok(Some(doc)) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "id": doc.id,
                        "title": doc.title,
                        "file_type": format!("{:?}", doc.file_type).to_lowercase(),
                        "content": doc.content,
                        "total_pages": doc.total_pages,
                        "tags": doc.tags,
                        "category": doc.category
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Ok(None) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": "Document not found"
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_search_documents(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let query = args["query"].as_str().ok_or("query is required")?;

        match self.repository.list_documents().await {
            Ok(docs) => {
                let filtered: Vec<_> = docs
                    .into_iter()
                    .filter(|d| {
                        d.title.to_lowercase().contains(&query.to_lowercase())
                            || d.content.as_ref().map_or(false, |c| c.to_lowercase().contains(&query.to_lowercase()))
                    })
                    .take(args["limit"].as_u64().unwrap_or(10) as usize)
                    .collect();

                Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "count": filtered.len(),
                            "results": filtered.iter().map(|d| json!({
                                "id": d.id,
                                "title": d.title,
                                "file_type": format!("{:?}", d.file_type).to_lowercase()
                            })).collect::<Vec<_>>()
                        }).to_string(),
                    }],
                    is_error: Some(false),
                })
            }
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_update_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;

        // First get the existing document
        let mut doc = match self.repository.get_document(document_id).await {
            Ok(Some(d)) => d,
            Ok(None) => {
                return Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "success": false,
                            "error": "Document not found"
                        }).to_string(),
                    }],
                    is_error: Some(true),
                });
            }
            Err(e) => {
                return Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "success": false,
                            "error": e.to_string()
                        }).to_string(),
                    }],
                    is_error: Some(true),
                });
            }
        };

        // Apply updates
        if let Some(title) = args["title"].as_str() {
            doc.title = title.to_string();
        }
        if let Some(tags) = args["tags"].as_array() {
            doc.tags = tags.iter().filter_map(|t| t.as_str().map(|s| s.to_string())).collect();
        }
        doc.date_modified = Utc::now();

        match self.repository.update_document(document_id, &doc).await {
            Ok(updated) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "id": updated.id,
                        "title": updated.title,
                        "message": "Document updated successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_delete_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;

        match self.repository.delete_document(document_id).await {
            Ok(_) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "message": "Document deleted successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_create_cloze_card(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let text = args["text"].as_str().ok_or("text is required")?;
        let document_id = args["document_id"].as_str();

        let mut item = LearningItem::new(ItemType::Cloze, text.to_string());
        item.document_id = document_id.map(|s| s.to_string());
        item.cloze_text = Some(text.to_string());

        match self.repository.create_learning_item(&item).await {
            Ok(created) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "id": created.id,
                        "type": "cloze",
                        "message": "Cloze card created successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_create_qa_card(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let question = args["question"].as_str().ok_or("question is required")?;
        let answer = args["answer"].as_str().ok_or("answer is required")?;
        let document_id = args["document_id"].as_str();

        let mut item = LearningItem::new(ItemType::Qa, question.to_string());
        item.document_id = document_id.map(|s| s.to_string());
        item.answer = Some(answer.to_string());

        match self.repository.create_learning_item(&item).await {
            Ok(created) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "id": created.id,
                        "type": "qa",
                        "message": "Q&A card created successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_create_extract(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let content = args["content"].as_str().ok_or("content is required")?;
        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;
        let note = args["note"].as_str();
        let color = args["color"].as_str();
        let tags = args["tags"].as_array();

        let mut extract = Extract::new(document_id.to_string(), content.to_string());
        if let Some(note) = note {
            extract.notes = Some(note.to_string());
        }
        if let Some(color) = color {
            extract.highlight_color = Some(color.to_string());
        }
        if let Some(tags) = tags {
            extract.tags = tags.iter().filter_map(|t| t.as_str().map(|s| s.to_string())).collect();
        }

        match self.repository.create_extract(&extract).await {
            Ok(created) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "id": created.id,
                        "content": created.content,
                        "message": "Extract created successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_get_learning_items(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;
        let item_type_filter = args["item_type"].as_str();

        match self.repository.get_learning_items_by_document(document_id).await {
            Ok(items) => {
                let filtered: Vec<_> = if let Some(item_type) = item_type_filter {
                    items.into_iter()
                        .filter(|i| format!("{:?}", i.item_type).to_lowercase() == item_type)
                        .collect()
                } else {
                    items
                };

                Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "count": filtered.len(),
                            "items": filtered.iter().map(|i| json!({
                                "id": i.id,
                                "type": format!("{:?}", i.item_type).to_lowercase(),
                                "question": i.question,
                                "answer": i.answer,
                                "state": format!("{:?}", i.state).to_lowercase()
                            })).collect::<Vec<_>>()
                        }).to_string(),
                    }],
                    is_error: Some(false),
                })
            }
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_get_document_extracts(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;

        match self.repository.list_extracts_by_document(document_id).await {
            Ok(extracts) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "count": extracts.len(),
                        "extracts": extracts.iter().map(|e| json!({
                            "id": e.id,
                            "content": e.content,
                            "notes": e.notes,
                            "highlight_color": e.highlight_color,
                            "tags": e.tags
                        })).collect::<Vec<_>>()
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_get_review_queue(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let limit = args["limit"].as_u64().unwrap_or(20) as usize;

        match self.repository.get_due_learning_items(&Utc::now()).await {
            Ok(items) => {
                let limited: Vec<_> = items.into_iter().take(limit).collect();

                Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "count": limited.len(),
                            "items": limited.iter().map(|i| json!({
                                "id": i.id,
                                "type": format!("{:?}", i.item_type).to_lowercase(),
                                "question": i.question,
                                "due_date": i.due_date
                            })).collect::<Vec<_>>()
                        }).to_string(),
                    }],
                    is_error: Some(false),
                })
            }
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_submit_review(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let item_id = args["item_id"].as_str().ok_or("item_id is required")?;
        let rating = args["rating"].as_u64().ok_or("rating is required")?;

        match apply_fsrs_review(self.repository.as_ref(), item_id, rating as i32, 0, None).await {
            Ok(_) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "message": "Review submitted successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_rate_document(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        use crate::algorithms::DocumentScheduler;
        use crate::models::ReviewRating;

        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;
        let rating = args["rating"].as_u64().ok_or("rating is required")?;
        let time_taken = args["time_taken"].as_i64().map(|t| t as i32);

        // Get the document
        let document = match self.repository.get_document(document_id).await {
            Ok(Some(d)) => d,
            Ok(None) => {
                return Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "success": false,
                            "error": "Document not found"
                        }).to_string(),
                    }],
                    is_error: Some(true),
                });
            }
            Err(e) => {
                return Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "success": false,
                            "error": e.to_string()
                        }).to_string(),
                    }],
                    is_error: Some(true),
                });
            }
        };

        let scheduler = DocumentScheduler::default_params();
        let now = Utc::now();

        // Calculate elapsed days since last review
        let elapsed_days = document.date_last_reviewed
            .map(|lr| (now - lr).num_seconds() as f64 / 86400.0)
            .unwrap_or_else(|| {
                (now - document.date_added).num_seconds() as f64 / 86400.0
            })
            .max(0.0);

        let review_rating = ReviewRating::from(rating as i32);

        // Schedule the document using FSRS
        let result = scheduler.schedule_document(
            review_rating,
            document.stability,
            document.difficulty,
            elapsed_days
        );

        // Update the document with new scheduling data
        let new_reps = document.reps.unwrap_or(0) + 1;
        let new_time_spent = document.total_time_spent.unwrap_or(0) + time_taken.unwrap_or(0);

        match self.repository.update_document_scheduling(
            &document.id,
            Some(result.next_review),
            Some(result.stability),
            Some(result.difficulty),
            Some(new_reps),
            Some(new_time_spent),
        ).await {
            Ok(_) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "message": "Document rated successfully",
                        "next_review_date": result.next_review.to_rfc3339(),
                        "stability": result.stability,
                        "difficulty": result.difficulty,
                        "interval_days": result.interval_days
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_rate_extract(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        use crate::algorithms::DocumentScheduler;
        use crate::models::ReviewRating;

        let extract_id = args["extract_id"].as_str().ok_or("extract_id is required")?;
        let rating = args["rating"].as_u64().ok_or("rating is required")?;
        let time_taken = args["time_taken"].as_i64().map(|t| t as i32);

        // Get the extract
        let extract = match self.repository.get_extract(extract_id).await {
            Ok(Some(e)) => e,
            Ok(None) => {
                return Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "success": false,
                            "error": "Extract not found"
                        }).to_string(),
                    }],
                    is_error: Some(true),
                });
            }
            Err(e) => {
                return Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "success": false,
                            "error": e.to_string()
                        }).to_string(),
                    }],
                    is_error: Some(true),
                });
            }
        };

        let scheduler = DocumentScheduler::default_params();
        let now = Utc::now();

        // Calculate elapsed days since last review
        let elapsed_days = extract.last_review_date
            .map(|lr| (now - lr).num_seconds() as f64 / 86400.0)
            .unwrap_or_else(|| {
                (now - extract.date_created).num_seconds() as f64 / 86400.0
            })
            .max(0.0);

        let review_rating = ReviewRating::from(rating as i32);

        // Get current stability and difficulty from memory state
        let current_stability = extract.memory_state.as_ref().map(|ms| ms.stability);
        let current_difficulty = extract.memory_state.as_ref().map(|ms| ms.difficulty);

        // Schedule the extract using FSRS
        let result = scheduler.schedule_document(
            review_rating,
            current_stability,
            current_difficulty,
            elapsed_days
        );

        // Update the extract with new scheduling data
        let new_review_count = extract.review_count + 1;
        let new_reps = extract.reps + 1;
        let last_review = Some(now);

        match self.repository.update_extract_scheduling(
            &extract.id,
            Some(result.next_review),
            Some(result.stability),
            Some(result.difficulty),
            Some(new_review_count),
            Some(new_reps),
            last_review,
        ).await {
            Ok(_) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "message": "Extract rated successfully",
                        "next_review_date": result.next_review.to_rfc3339(),
                        "stability": result.stability,
                        "difficulty": result.difficulty,
                        "interval_days": result.interval_days
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_get_statistics(&self, _args: serde_json::Value) -> Result<ToolCallResult, String> {
        let docs = self.repository.list_documents().await.unwrap_or_default();
        let items = self.repository.get_all_learning_items().await.unwrap_or_default();

        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: json!({
                    "documents": docs.len(),
                    "learning_items": items.len(),
                    "reviews": items.iter().map(|i| i.review_count).sum::<i32>(),
                    "due_today": items.iter().filter(|i| i.due_date <= Utc::now()).count()
                }).to_string(),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_add_pdf_selection(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let document_id = args["document_id"].as_str().ok_or("document_id is required")?;
        let page_number = args["page_number"].as_u64().ok_or("page_number is required")?;
        let selection = args["selection"].as_str().ok_or("selection is required")?;

        // Create an extract from the PDF selection
        let mut extract = Extract::new(document_id.to_string(), selection.to_string());
        extract.page_number = Some(page_number as i32);
        extract.highlight_color = Some("yellow".to_string());

        match self.repository.create_extract(&extract).await {
            Ok(created) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": true,
                        "id": created.id,
                        "page_number": page_number,
                        "message": "PDF selection added successfully"
                    }).to_string(),
                }],
                is_error: Some(false),
            }),
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }

    async fn execute_batch_create_cards(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let cards = args["cards"].as_array().ok_or("cards array is required")?;
        let mut results = vec![];

        for card in cards {
            let question = card["question"].as_str();
            let answer = card["answer"].as_str();
            let card_type = card["type"].as_str().unwrap_or("flashcard");

            if let Some(question) = question {
                let item_type = match card_type {
                    "qa" => ItemType::Qa,
                    "cloze" => ItemType::Cloze,
                    _ => ItemType::Flashcard,
                };

                let mut item = LearningItem::new(item_type, question.to_string());
                item.answer = answer.map(|a| a.to_string());

                match self.repository.create_learning_item(&item).await {
                    Ok(created) => {
                        results.push(json!({
                            "success": true,
                            "id": created.id
                        }));
                    }
                    Err(e) => {
                        results.push(json!({
                            "success": false,
                            "error": e.to_string()
                        }));
                    }
                }
            }
        }

        Ok(ToolCallResult {
            content: vec![ToolContent {
                r#type: "text".to_string(),
                text: json!({
                    "created": results.len(),
                    "results": results
                }).to_string(),
            }],
            is_error: Some(false),
        })
    }

    async fn execute_get_queue_documents(&self, args: serde_json::Value) -> Result<ToolCallResult, String> {
        let count = args["count"].as_u64().unwrap_or(10) as usize;

        match self.repository.list_documents().await {
            Ok(docs) => {
                let queued: Vec<_> = docs.into_iter()
                    .filter(|d| !d.is_archived)
                    .take(count)
                    .collect();

                Ok(ToolCallResult {
                    content: vec![ToolContent {
                        r#type: "text".to_string(),
                        text: json!({
                            "count": queued.len(),
                            "documents": queued.iter().map(|d| json!({
                                "id": d.id,
                                "title": d.title,
                                "file_type": format!("{:?}", d.file_type).to_lowercase(),
                                "priority_score": d.priority_score
                            })).collect::<Vec<_>>()
                        }).to_string(),
                    }],
                    is_error: Some(false),
                })
            }
            Err(e) => Ok(ToolCallResult {
                content: vec![ToolContent {
                    r#type: "text".to_string(),
                    text: json!({
                        "success": false,
                        "error": e.to_string()
                    }).to_string(),
                }],
                is_error: Some(true),
            }),
        }
    }
}
