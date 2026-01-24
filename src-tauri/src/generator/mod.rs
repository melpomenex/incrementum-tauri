//! Learning item generation from extracts
//!
//! This module provides functionality to automatically generate
//! learning items (flashcards) from document extracts.

use crate::models::{Extract, LearningItem, ItemType};

/// Generator for creating learning items from extracts
pub struct LearningItemGenerator {
    /// Maximum number of clozes to generate per extract
    max_clozes: usize,
    /// Minimum word count for cloze deletion
    min_cloze_words: usize,
}

impl Default for LearningItemGenerator {
    fn default() -> Self {
        Self {
            max_clozes: 3,
            min_cloze_words: 3,
        }
    }
}

impl LearningItemGenerator {
    pub fn new() -> Self {
        Self::default()
    }

    /// Generate learning items from an extract
    pub fn generate_from_extract(&self, extract: &Extract) -> Vec<LearningItem> {
        let mut items = Vec::new();

        // Generate cloze deletion items
        items.extend(self.generate_clozes(extract));

        // Generate Q&A items for concept-type extracts
        if extract.category.as_deref() == Some("Definition") ||
           extract.category.as_deref() == Some("Concept") {
            if let Some(qa_item) = self.generate_qa(extract) {
                items.push(qa_item);
            }
        }

        items
    }

    /// Generate cloze deletion cards from extract content
    fn generate_clozes(&self, extract: &Extract) -> Vec<LearningItem> {
        let content = extract.content.trim();
        if content.is_empty() || content.len() < 50 {
            return Vec::new();
        }

        let mut items = Vec::new();
        let sentences: Vec<&str> = content
            .split_terminator('.')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty() && s.split_whitespace().count() >= 8)
            .collect();

        // Select up to max_clozes sentences spread throughout the extract
        let step = if sentences.len() > self.max_clozes {
            sentences.len() / self.max_clozes
        } else {
            1
        };

        for (i, sentence) in sentences.iter().enumerate() {
            if i % step != 0 || items.len() >= self.max_clozes {
                continue;
            }

            if let Some(cloze) = self.create_cloze(sentence, extract) {
                items.push(cloze);
            }
        }

        items
    }

    /// Create a single cloze deletion item from a sentence
    fn create_cloze(&self, sentence: &str, extract: &Extract) -> Option<LearningItem> {
        let words: Vec<&str> = sentence.split_whitespace().collect();
        if words.len() < self.min_cloze_words {
            return None;
        }

        // Find the most important word to cloze (prefer nouns/keywords)
        // For simplicity, we'll cloze a word in the middle that's reasonably long
        let middle_idx = words.len() / 2;
        let cloze_idx = words.iter()
            .enumerate()
            .skip(middle_idx.saturating_sub(2))
            .take(5)
            .filter(|(_, w)| w.len() >= 4)
            .map(|(i, _)| i)
            .next()
            .unwrap_or(middle_idx);

        let hidden_word = words.get(cloze_idx)?;
        let _hint = self.generate_cloze_hint(sentence, cloze_idx);

        // Build the clozed question
        let question = words.iter()
            .enumerate()
            .map(|(i, w)| {
                if i == cloze_idx {
                    "[...]".to_string()
                } else {
                    w.to_string()
                }
            })
            .collect::<Vec<_>>()
            .join(" ");

        let answer = hidden_word.to_string();

        Some(LearningItem::from_extract(
            extract.id.clone(),
            extract.document_id.clone(),
            ItemType::Cloze,
            question,
            Some(answer),
        ))
    }

    /// Generate a hint for the cloze (first letter, word count, etc.)
    fn generate_cloze_hint(&self, sentence: &str, cloze_idx: usize) -> String {
        let words: Vec<&str> = sentence.split_whitespace().collect();
        if let Some(word) = words.get(cloze_idx) {
            format!("{} letters, starts with '{}'", word.len(),
                word.chars().next().unwrap_or('_'))
        } else {
            "Answer the missing word".to_string()
        }
    }

    /// Generate a Q&A pair from a definition/concept extract
    fn generate_qa(&self, extract: &Extract) -> Option<LearningItem> {
        let content = extract.content.trim();
        if content.is_empty() {
            return None;
        }

        // Try to extract a term and definition
        // Look for patterns like "Term: Definition" or "Term - Definition"
        let question = if let Some(colon_pos) = content.find(':') {
            content[..colon_pos].trim().to_string()
        } else if let Some(dash_pos) = content.find(" - ") {
            content[..dash_pos].trim().to_string()
        } else if let Some(dash_pos) = content.find("—") {
            content[..dash_pos].trim().to_string()
        } else {
            // Use the extract's category or first few words
            format!("What is: {}?", content.split_whitespace()
                .take(5)
                .collect::<Vec<_>>()
                .join(" "))
        };

        let answer = if let Some(colon_pos) = content.find(':') {
            content[colon_pos + 1..].trim().to_string()
        } else if let Some(dash_pos) = content.find(" - ") {
            content[dash_pos + 3..].trim().to_string()
        } else if let Some(dash_pos) = content.find("—") {
            content[dash_pos + 3..].trim().to_string()
        } else {
            content.to_string()
        };

        if question.len() < 3 || answer.len() < 10 {
            return None;
        }

        Some(LearningItem::from_extract(
            extract.id.clone(),
            extract.document_id.clone(),
            ItemType::Qa,
            format!("Define: {}", question),
            Some(answer),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_test_extract(content: &str, category: Option<&str>) -> Extract {
        use crate::models::Extract;
        use uuid::Uuid;

        Extract {
            id: Uuid::new_v4().to_string(),
            document_id: "test-doc".to_string(),
            content: content.to_string(),
            page_title: None,
            page_number: None,
            highlight_color: None,
            notes: None,
            progressive_disclosure_level: 0,
            max_disclosure_level: 3,
            date_created: Utc::now(),
            date_modified: Utc::now(),
            tags: vec![],
            category: category.map(|c| c.to_string()),
            memory_state: None,
            next_review_date: None,
            last_review_date: None,
            review_count: 0,
            reps: 0,
        }
    }

    #[test]
    fn test_generate_clozes() {
        let generator = LearningItemGenerator::new();
        let extract = create_test_extract(
            "The mitochondria is the powerhouse of the cell. It generates most of the chemical energy needed to power the cell's biochemical reactions.",
            None
        );

        let items = generator.generate_clozes(&extract);
        assert!(!items.is_empty());
        assert!(items.iter().all(|item| item.item_type == ItemType::Cloze));
    }

    #[test]
    fn test_generate_qa() {
        let generator = LearningItemGenerator::new();
        let extract = create_test_extract(
            "Photosynthesis: The process by which plants convert light energy into chemical energy.",
            Some("Definition")
        );

        let items = generator.generate_from_extract(&extract);
        assert!(!items.is_empty());
    }
}
