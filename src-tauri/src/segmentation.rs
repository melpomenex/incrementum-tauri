//! Document auto-segmentation service
//!
//! Automatically splits documents into extracts using various strategies:
//! - Semantic segmentation (AI-powered)
//! - Paragraph-based segmentation
//! - Fixed-length segmentation
//! - Smart adaptive segmentation

use crate::error::Result;
use std::collections::HashMap;

/// Segmentation method
#[derive(Debug, Clone, Copy, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
pub enum SegmentationMethod {
    /// AI-powered semantic segmentation
    Semantic,
    /// Split by paragraphs
    Paragraph,
    /// Fixed word/character count
    Fixed,
    /// Adaptive based on content type
    Smart,
}

/// Segment configuration
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SegmentConfig {
    /// Segmentation method
    pub method: SegmentationMethod,
    /// Target segment length (in words)
    pub target_length: usize,
    /// Overlap between segments (in words)
    pub overlap: usize,
    /// Minimum segment length
    pub min_length: usize,
    /// Maximum segment length
    pub max_length: usize,
}

impl Default for SegmentConfig {
    fn default() -> Self {
        Self {
            method: SegmentationMethod::Smart,
            target_length: 200,
            overlap: 20,
            min_length: 50,
            max_length: 1000,
        }
    }
}

/// Document segment
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DocumentSegment {
    /// Segment index
    pub index: usize,
    /// Segment content
    pub content: String,
    /// Character count
    pub char_count: usize,
    /// Word count
    pub word_count: usize,
    /// Start position (character offset)
    pub start_pos: usize,
    /// End position (character offset)
    pub end_pos: usize,
    /// Chapter/section title if detected
    pub chapter_title: Option<String>,
    /// Key points (AI-extracted)
    pub key_points: Vec<String>,
    /// Segmentation metadata
    pub metadata: HashMap<String, String>,
}

/// Segmentation result
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SegmentationResult {
    /// All segments
    pub segments: Vec<DocumentSegment>,
    /// Total character count
    pub total_chars: usize,
    /// Total word count
    pub total_words: usize,
    /// Number of segments created
    pub segment_count: usize,
    /// Average segment length
    pub avg_segment_length: f64,
}

/// Document segmenter
pub struct DocumentSegmenter {
    config: SegmentConfig,
}

impl DocumentSegmenter {
    pub fn new(config: SegmentConfig) -> Self {
        Self { config }
    }

    pub fn with_default() -> Self {
        Self::new(SegmentConfig::default())
    }

    /// Segment document content
    pub fn segment(&self, content: &str) -> Result<SegmentationResult> {
        match self.config.method {
            SegmentationMethod::Semantic => self.segment_semantic(content),
            SegmentationMethod::Paragraph => self.segment_paragraph(content),
            SegmentationMethod::Fixed => self.segment_fixed(content),
            SegmentationMethod::Smart => self.segment_smart(content),
        }
    }

    /// Semantic segmentation using AI
    fn segment_semantic(&self, content: &str) -> Result<SegmentationResult> {
        // For semantic segmentation, we need to:
        // 1. Identify natural topic boundaries
        // 2. Maintain coherence within segments
        // 3. Use AI to understand context

        let mut segments = Vec::new();
        let paragraphs: Vec<&str> = content.split("\n\n").filter(|s| !s.trim().is_empty()).collect();

        let mut current_segment = String::new();
        let mut current_start = 0;
        let mut segment_index = 0;

        for para in paragraphs {
            let para_word_count = para.split_whitespace().count();
            let current_word_count = current_segment.split_whitespace().count();

            // If adding this paragraph would exceed target length significantly,
            // and we have enough content, start a new segment
            if current_word_count > self.config.min_length
                && current_word_count + para_word_count > self.config.target_length + self.config.overlap
                && !current_segment.is_empty() {
                    segments.push(self.create_segment(
                        segment_index,
                        &current_segment,
                        current_start,
                        current_start + current_segment.len(),
                    ));
                    segment_index += 1;
                    current_start += current_segment.len();

                    // Start new segment with overlap if configured
                    if self.config.overlap > 0 {
                        let mut overlap_words: Vec<&str> = current_segment
                            .split_whitespace()
                            .rev()
                            .take(self.config.overlap)
                            .collect();
                        overlap_words.reverse();
                        current_segment = overlap_words.join(" ") + " ";
                    } else {
                        current_segment = String::new();
                    }
                }

            current_segment.push_str(para);
            current_segment.push_str("\n\n");
        }

        // Don't forget the last segment
        if !current_segment.trim().is_empty() {
            segments.push(self.create_segment(
                segment_index,
                current_segment.trim(),
                current_start,
                content.len(),
            ));
        }

        Ok(self.build_result(segments, content))
    }

    /// Paragraph-based segmentation
    fn segment_paragraph(&self, content: &str) -> Result<SegmentationResult> {
        let mut segments = Vec::new();
        let paragraphs: Vec<&str> = content.split("\n\n").filter(|s| !s.trim().is_empty()).collect();

        let mut current_segment = String::new();
        let mut current_start = 0;
        let mut segment_index = 0;

        for para in paragraphs {
            let _para_word_count = para.split_whitespace().count();
            let current_word_count = current_segment.split_whitespace().count();

            if current_word_count >= self.config.target_length {
                // Current segment is full, save it
                if !current_segment.is_empty() {
                    segments.push(self.create_segment(
                        segment_index,
                        &current_segment,
                        current_start,
                        current_start + current_segment.len(),
                    ));
                    segment_index += 1;
                    current_start += current_segment.len();
                    current_segment = String::new();
                }
            }

            current_segment.push_str(para);
            current_segment.push_str("\n\n");
        }

        // Last segment
        if !current_segment.trim().is_empty() {
            segments.push(self.create_segment(
                segment_index,
                current_segment.trim(),
                current_start,
                content.len(),
            ));
        }

        Ok(self.build_result(segments, content))
    }

    /// Fixed-length segmentation
    fn segment_fixed(&self, content: &str) -> Result<SegmentationResult> {
        let words: Vec<&str> = content.split_whitespace().collect();
        let mut segments = Vec::new();

        let chunk_size = self.config.target_length;
        let overlap = self.config.overlap;

        let mut i = 0;
        let mut segment_index = 0;
        let mut current_pos = 0;

        while i < words.len() {
            let end = (i + chunk_size).min(words.len());
            let chunk_words = &words[i..end];

            // Build segment content
            let segment_content = chunk_words.join(" ");
            let segment_start = current_pos;

            // Track position
            for word in &words[i..end] {
                current_pos += word.len() + 1; // +1 for space
            }

            segments.push(self.create_segment(
                segment_index,
                &segment_content,
                segment_start,
                current_pos,
            ));
            segment_index += 1;

            // Move forward with overlap
            if end < words.len() {
                i = end - overlap.min(i);
            } else {
                break;
            }
        }

        Ok(self.build_result(segments, content))
    }

    /// Smart adaptive segmentation
    fn segment_smart(&self, content: &str) -> Result<SegmentationResult> {
        // Smart segmentation detects document structure and adapts:
        // 1. Look for headers/chapters
        // 2. Detect bullet points and lists
        // 3. Identify code blocks
        // 4. Maintain logical groupings

        // Detect structure markers
        let header_pattern = regex::Regex::new(r"^(#{1,3}\s|Chapter\s|Part\s|\d+\.\d+\s)")
            .unwrap_or_else(|_| regex::Regex::new(r"^#").unwrap());

        let mut segments = Vec::new();
        let lines: Vec<&str> = content.lines().collect();
        let mut current_segment_lines = Vec::new();
        let mut current_start = 0;
        let mut segment_index = 0;
        let mut current_length = 0;

        for line in lines.iter() {
            let is_header = header_pattern.is_match(line.trim());
            let line_words = line.split_whitespace().count();

            // Start new segment on header if we have content
            if is_header && !current_segment_lines.is_empty() && current_length > self.config.min_length {
                let segment_content = current_segment_lines.join("\n");
                segments.push(self.create_segment(
                    segment_index,
                    &segment_content,
                    current_start,
                    current_start + segment_content.len(),
                ));
                segment_index += 1;
                current_start += segment_content.len();
                current_segment_lines = Vec::new();
                current_length = 0;
            }

            // Add line to current segment
            current_segment_lines.push(*line);
            current_length += line_words;

            // Check if segment is too long
            if current_length >= self.config.max_length && !is_header {
                // Find a good break point (empty line or sentence end)
                let break_point = current_segment_lines
                    .iter()
                    .rposition(|l| l.trim().is_empty() || l.ends_with('.') || l.ends_with('!') || l.ends_with('?'));

                if let Some(pos) = break_point {
                    if pos < current_segment_lines.len() - 1 {
                        let segment_content = current_segment_lines[..=pos].join("\n");
                        segments.push(self.create_segment(
                            segment_index,
                            &segment_content,
                            current_start,
                            current_start + segment_content.len(),
                        ));
                        segment_index += 1;
                        current_start += segment_content.len();
                        current_segment_lines = current_segment_lines[pos + 1..].to_vec();
                        current_length = current_segment_lines.iter().map(|l| l.split_whitespace().count()).sum();
                    }
                }
            }
        }

        // Last segment
        if !current_segment_lines.is_empty() {
            let segment_content = current_segment_lines.join("\n");
            segments.push(self.create_segment(
                segment_index,
                &segment_content,
                current_start,
                current_start + segment_content.len(),
            ));
        }

        Ok(self.build_result(segments, content))
    }

    /// Create a segment with metadata
    fn create_segment(
        &self,
        index: usize,
        content: &str,
        start_pos: usize,
        end_pos: usize,
    ) -> DocumentSegment {
        let char_count = content.len();
        let word_count = content.split_whitespace().count();

        // Try to detect chapter title from first line
        let chapter_title = content
            .lines()
            .next()
            .and_then(|line| {
                if line.starts_with('#') || line.starts_with("Chapter") || line.starts_with("Part") {
                    Some(line.trim().to_string())
                } else {
                    None
                }
            });

        let mut metadata = HashMap::new();
        metadata.insert("method".to_string(), format!("{:?}", self.config.method));
        metadata.insert("created_at".to_string(), chrono::Utc::now().to_rfc3339());

        DocumentSegment {
            index,
            content: content.trim().to_string(),
            char_count,
            word_count,
            start_pos,
            end_pos,
            chapter_title,
            key_points: Vec::new(),
            metadata,
        }
    }

    /// Build result from segments
    fn build_result(&self, segments: Vec<DocumentSegment>, content: &str) -> SegmentationResult {
        let segment_count = segments.len();
        let total_chars = content.len();
        let total_words = content.split_whitespace().count();
        let avg_segment_length = if segment_count > 0 {
            segments.iter().map(|s| s.word_count).sum::<usize>() as f64 / segment_count as f64
        } else {
            0.0
        };

        SegmentationResult {
            segments,
            total_chars,
            total_words,
            segment_count,
            avg_segment_length,
        }
    }

    /// Update configuration
    pub fn update_config(&mut self, config: SegmentConfig) {
        self.config = config;
    }
}

/// Extract key points from text (placeholder for AI integration)
pub async fn extract_key_points(text: &str, max_points: usize) -> Result<Vec<String>> {
    // This would use AI in production
    // For now, return sentences with important keywords
    let sentences: Vec<&str> = text
        .split(&['.', '!', '?'][..])
        .filter(|s| s.len() > 10)
        .collect();

    // Simple heuristic: sentences with "important", "key", "main", "critical"
    let key_indicators = ["important", "key", "main", "critical", "essential", "significant", "fundamental"];

    let mut scored = sentences.iter().enumerate().map(|(i, s)| {
        let score = key_indicators.iter()
            .filter(|kw| s.to_lowercase().contains(**kw))
            .count();
        (i, s, score)
    }).collect::<Vec<_>>();

    scored.sort_by(|a, b| b.2.cmp(&a.2));

    Ok(scored.into_iter()
        .take(max_points)
        .map(|(_, s, _)| s.trim().to_string())
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fixed_segmentation() {
        let segmenter = DocumentSegmenter::new(SegmentConfig {
            method: SegmentationMethod::Fixed,
            target_length: 5,
            overlap: 1,
            min_length: 3,
            max_length: 10,
        });

        let content = "one two three four five six seven eight nine ten";
        let result = segmenter.segment(content).unwrap();

        assert!(!result.segments.is_empty());
        assert!(result.segment_count > 1);
    }

    #[test]
    fn test_paragraph_segmentation() {
        let segmenter = DocumentSegmenter::new(SegmentConfig {
            method: SegmentationMethod::Paragraph,
            target_length: 1,
            overlap: 0,
            min_length: 10,
            max_length: 500,
        });

        let content = "This is paragraph one.\n\nThis is paragraph two.\n\nThis is paragraph three.";
        let result = segmenter.segment(content).unwrap();

        assert_eq!(result.segment_count, 3);
    }

    #[test]
    fn test_segment_metadata() {
        let segmenter = DocumentSegmenter::with_default();
        let content = "# Chapter 1\n\nThis is the content.";

        let result = segmenter.segment(content).unwrap();
        assert!(!result.segments.is_empty());

        let first = &result.segments[0];
        assert_eq!(first.index, 0);
        assert!(first.content.len() > 0);
    }
}
