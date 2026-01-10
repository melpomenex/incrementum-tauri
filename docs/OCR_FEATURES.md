# OCR Features Documentation

## Overview

Incrementum provides comprehensive Optical Character Recognition (OCR) capabilities to extract text from images, scanned documents, and PDFs. This guide covers all OCR features and how to configure them.

## Table of Contents

1. [OCR Providers](#ocr-providers)
2. [Configuration](#configuration)
3. [Auto-OCR](#auto-ocr)
4. [Math OCR](#math-ocr)
5. [Key Phrase Extraction](#key-phrase-extraction)
6. [Advanced Features](#advanced-features)
7. [Troubleshooting](#troubleshooting)

---

## OCR Providers

Incrementum supports multiple OCR providers, each with different strengths:

### Local Providers

| Provider | Description | Best For |
|----------|-------------|----------|
| **Tesseract** | Open-source OCR engine running locally | General text extraction, privacy-focused workflows |
| **Marker** | Converts PDFs to Markdown | Document conversion, clean text extraction |
| **Nougat** | Specialized for scientific documents with math | Academic papers, textbooks with formulas |

### Cloud Providers

| Provider | Description | Best For |
|----------|-------------|----------|
| **Google Document AI** | Google's cloud-based document AI | High accuracy, complex layouts, handwriting |
| **AWS Textract** | Amazon's text extraction service | Enterprise workflows, AWS users |
| **Azure Computer Vision** | Microsoft's vision API | Azure ecosystems, mixed content types |

---

## Configuration

### Accessing OCR Settings

1. Go to **Settings** → **Documents**
2. Scroll to the **OCR (Optical Character Recognition)** section

### Provider Selection

Choose your preferred OCR provider from the dropdown menu:

- **For privacy**: Use Tesseract, Marker, or Nougat (all process locally)
- **For accuracy**: Use Google Document AI or cloud providers
- **For scientific content**: Use Nougat with Math OCR enabled

### Language Settings

Select the primary language for text recognition. Supported languages include:

- English
- Spanish, French, German, Italian, Portuguese
- Chinese (Simplified/Traditional)
- Japanese, Korean
- Arabic, Hindi, Dutch, Polish, Turkish, Vietnamese, Thai, Hebrew

---

## Auto-OCR

Auto-OCR automatically processes images and scanned documents when they are imported into Incrementum.

### Enabling Auto-OCR

1. Go to **Settings** → **Documents** → **OCR Settings**
2. Toggle **Auto-OCR** to ON
3. Choose your preferred provider and language

### What Auto-OCR Does

When enabled, Auto-OCR will:
- Extract text from imported images
- Process scanned PDF pages
- Store extracted text for searching
- Enable text selection in viewers

### Performance Considerations

- **Local providers**: Slower but no internet required
- **Cloud providers**: Faster but require internet and may incur costs

---

## Math OCR

Math OCR specializes in extracting mathematical equations and formulas from scientific documents.

### Enabling Math OCR

1. Go to **Settings** → **Documents** → **OCR Settings**
2. Toggle **Math OCR** to ON
3. Select a model:
   - **Nougat** (Meta's model, recommended for general use)
   - **pix2tex** (LaTeX-OCR, good for equations)
   - **LaTeX-OCR** (lightweight alternative)

### What Math OCR Extracts

- Mathematical equations (`\frac{1}{2}`, `\int_0^1 x^2 dx`)
- Chemical formulas
- Physical expressions
- Statistical notation

### Math OCR Output

Math expressions are returned in LaTeX format and can be:
- Previewed in the document viewer
- Exported as LaTeX code
- Converted to HTML for web display

---

## Key Phrase Extraction

Key phrase extraction automatically identifies important keywords and phrases from extracted text.

### Enabling Key Phrase Extraction

1. Go to **Settings** → **Documents** → **OCR Settings**
2. Toggle **Key Phrase Extraction** to ON

### How It Works

The RAKE (Rapid Automatic Keyword Extraction) algorithm:
1. Analyzes word frequency across the document
2. Identifies candidate phrases between stop words
3. Scores phrases by relevance
4. Returns the top-ranked phrases

### Use Cases

- **Document Summarization**: Quick overview of key topics
- **Search Enhancement**: Better search results
- **Learning Aid**: Identify important concepts to review
- **Content Organization**: Auto-tag documents by topic

---

## Advanced Features

### Auto-Extract on Document Load

When enabled, documents are automatically processed when opened:

1. Go to **Settings** → **Documents** → **OCR Settings**
2. Toggle **Auto-Extract on Load** to ON

This feature:
- Extracts text in the background
- Identifies key phrases
- Detects mathematical content
- Caches results for faster subsequent access

### Prefer Local Processing

Force local OCR even when cloud providers are configured:

1. Toggle **Prefer Local OCR** to ON
2. Useful for sensitive documents or offline workflows

### Multi-Provider Fallback

If your primary provider fails, Incrementum will automatically fall back to:
1. Tesseract (if available)
2. Other configured local providers

---

## Troubleshooting

### Tesseract Not Found

**Error**: "Tesseract not found. Please install it or provide the correct path."

**Solution**:
- **macOS**: `brew install tesseract`
- **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr`
- **Windows**: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)

### Marker Not Installed

**Error**: "Marker not found."

**Solution**:
```bash
pip install marker-pdf
```

### Nougat Not Available

**Error**: "Nougat not found."

**Solution**:
```bash
pip install nougat-ocr
```

### Google Document AI Configuration

To use Google Document AI, you need:

1. A Google Cloud project
2. Document AI API enabled
3. A processor created
4. Service account credentials JSON

**Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project or select existing
3. Enable Document AI API
4. Create a processor (Document OCR works for most use cases)
5. Create a service account with Document AI User role
6. Download the JSON credentials file
7. In Incrementum, enter:
   - Project ID
   - Location (e.g., `us` or `eu`)
   - Processor ID
   - Path to credentials JSON

### AWS Textract Configuration

1. Create an AWS account
2. Create an IAM user with `AmazonTextractFullAccess`
3. Generate access keys
4. Enter in Incrementum:
   - AWS Region (e.g., `us-east-1`)
   - Access Key ID
   - Secret Access Key

### Azure Computer Vision Configuration

1. Create a Computer Vision resource in Azure
2. Get the endpoint and API key from the Azure Portal
3. Enter in Incrementum:
   - Endpoint URL
   - API Key

### Low OCR Accuracy

**Possible causes**:
- Image resolution too low (use 300 DPI or higher)
- Poor image quality
- Wrong language selected
- Document type not supported by provider

**Solutions**:
- Scan at higher resolution
- Try a different provider
- Ensure correct language is selected
- For handwritten text, use Google Document AI

### Slow Performance

**For local providers**:
- Consider using cloud providers for faster processing
- Reduce the number of pages processed at once
- Close other applications using CPU resources

**For cloud providers**:
- Check internet connection speed
- Verify API quotas and limits

---

## Best Practices

### Choosing a Provider

| Use Case | Recommended Provider |
|----------|---------------------|
| Privacy-sensitive documents | Tesseract or Marker |
| Scientific papers | Nougat with Math OCR |
| Mixed text types | Google Document AI |
| Quick processing | Cloud providers |
| Offline use | Local providers (Tesseract, Marker) |

### Optimizing Accuracy

1. **Image Quality**: Use 300 DPI or higher
2. **Language**: Select the correct document language
3. **Preprocessing**: Remove noise, straighten pages
4. **Provider Selection**: Match provider to document type

### Performance Tips

1. **Batch Processing**: Process multiple documents in sequence
2. **Caching**: Enable auto-extract to cache results
3. **Local Preference**: Use local providers when possible
4. **Selective OCR**: Only OCR documents that need it

---

## Keyboard Shortcuts

When viewing a document:

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Search in document |
| `Ctrl/Cmd + A` | Select all text |
| `Ctrl/Cmd + C` | Copy selected text |

---

## API Access

For developers, OCR functionality is available through the Tauri API:

```typescript
import { ocrImageFile, extractKeyPhrases } from "./api/ocrCommands";

// OCR an image
const result = await ocrImageFile({
  image_path: ["/path/to/image.png"],
  provider: "tesseract",
  language: "eng",
});

// Extract key phrases
const phrases = await extractKeyPhrases({
  text: result.text,
  max_phrases: 10,
});
```

---

## Support

For issues or questions about OCR features:

1. Check this documentation first
2. Review the [GitHub Issues](https://github.com/your-repo/issues)
3. Create a new issue with:
   - Document type and source
   - OCR provider used
   - Error messages
   - Sample image (if appropriate)

---

## Changelog

### Version 1.0

- ✅ OCR provider selection UI
- ✅ Tesseract (local) integration
- ✅ Google Document AI integration
- ✅ AWS Textract integration
- ✅ Azure Computer Vision integration
- ✅ Marker (local PDF to markdown)
- ✅ Nougat (math OCR for scientific documents)
- ✅ Key phrase extraction (RAKE algorithm)
- ✅ Auto-extract on document load
- ✅ Math OCR with LaTeX output
