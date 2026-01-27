# OCR Features

Text extraction from images using multiple OCR providers.

---

## Overview

Incrementum provides Optical Character Recognition (OCR) capabilities to extract text from images, screenshots, scanned documents, and photos. This enables you to:

- Import text from screenshots and images
- Digitize scanned documents
- Extract content from photos of whiteboards or books
- Convert handwritten notes (with supported providers)
- Extract mathematical equations and formulas

---

## Supported OCR Providers

| Provider | Type | Best For | Internet Required |
|----------|------|----------|-------------------|
| **Tesseract** | Local | General text, on-device privacy | No |
| **Google Cloud Vision** | Cloud | High accuracy, multiple languages | Yes |
| **AWS Textract** | Cloud | Documents, tables, forms | Yes |
| **Mistral OCR** | Cloud | Modern AI-based extraction | Yes |
| **Mathpix** | Cloud | Mathematical equations, formulas | Yes |
| **GPT-4o Vision** | Cloud | Complex layouts, handwriting | Yes |
| **Claude Vision** | Cloud | Complex images, reasoning | Yes |

---

## Setup Guide

### Tesseract (Local OCR)

Tesseract runs locally on your device, providing privacy and offline capability.

#### Installation

**Windows**
1. Download installer from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
2. Run installer and note the installation path
3. Add to PATH or configure in Incrementum settings

**macOS**
```bash
brew install tesseract
brew install tesseract-lang  # Additional languages
```

**Linux (Ubuntu/Debian)**
```bash
sudo apt install tesseract-ocr
sudo apt install tesseract-ocr-all  # All languages
```

**Linux (Fedora)**
```bash
sudo dnf install tesseract
sudo dnf install tesseract-langpack-*
```

#### Configuration

1. Open **Settings → OCR**
2. Select **Tesseract** as provider
3. Set language(s) for recognition
4. Test with a sample image

---

### Google Cloud Vision

Best for high-accuracy text recognition with support for 50+ languages.

#### Setup

1. Create a [Google Cloud account](https://cloud.google.com/)
2. Enable the [Vision API](https://console.cloud.google.com/apis/library/vision.googleapis.com)
3. Create a [Service Account](https://console.cloud.google.com/iam-admin/serviceaccounts)
4. Download the JSON key file
5. In Incrementum: **Settings → OCR → Google Cloud Vision**
6. Paste the API key or upload the key file

#### Features

- **Document Text Detection**: Optimized for dense text
- **Handwriting Recognition**: Supports handwritten text
- **Language Detection**: Auto-detects text language
- **Text Annotation**: Preserves layout and formatting

---

### AWS Textract

Ideal for structured documents like forms and tables.

#### Setup

1. Create an [AWS account](https://aws.amazon.com/)
2. Navigate to [IAM Console](https://console.aws.amazon.com/iam/)
3. Create a user with `AmazonTextractFullAccess` permission
4. Generate Access Key ID and Secret Access Key
5. In Incrementum: **Settings → OCR → AWS Textract**
6. Enter your credentials

#### Features

- **Forms Extraction**: Key-value pairs from forms
- **Table Extraction**: Structured table data
- **Query Capability**: Ask questions about document content
- **Multi-page Documents**: Process multi-page PDFs

---

### Mistral OCR

Modern AI-based OCR with excellent accuracy.

#### Setup

1. Sign up at [Mistral AI](https://mistral.ai/)
2. Generate an API key from the console
3. In Incrementum: **Settings → OCR → Mistral OCR**
4. Enter your API key

---

### Mathpix

Specialized for mathematical equations and scientific notation.

#### Setup

1. Create account at [Mathpix](https://mathpix.com/)
2. Get API keys from the dashboard
3. In Incrementum: **Settings → OCR → Mathpix**
4. Enter App ID and App Key

#### Features

- **LaTeX Output**: Converts equations to LaTeX
- **MathML Support**: Standard mathematical markup
- **Chemistry Recognition**: Chemical formulas and structures
- **Symbol Recognition**: Greek letters, operators, matrices

**Example**: An image of `E = mc²` becomes:
```latex
E = mc^2
```

---

### GPT-4o Vision (OpenAI)

General-purpose vision model with strong OCR capabilities.

#### Setup

1. Create an [OpenAI account](https://platform.openai.com/)
2. Generate an API key
3. In Incrementum: **Settings → OCR → GPT-4o**
4. Enter your API key

#### Features

- **Complex Layouts**: Understands document structure
- **Handwriting**: Good handwritten text recognition
- **Context Understanding**: Can summarize extracted text
- **Multi-modal**: Can describe images alongside OCR

---

### Claude Vision (Anthropic)

Advanced vision capabilities with reasoning.

#### Setup

1. Create an [Anthropic account](https://console.anthropic.com/)
2. Generate an API key
3. In Incrementum: **Settings → OCR → Claude Vision**
4. Enter your API key

---

## Using OCR in Incrementum

### Screenshot Capture

1. Click **Documents → Import → Screenshot**
2. Select screen area to capture
3. OCR runs automatically on the captured image
4. Review and edit extracted text
5. Save as extract or document

**Keyboard Shortcut**: Set a global hotkey in Settings for quick capture

### Image Import

1. Click **Documents → Import → Image**
2. Select image file (PNG, JPG, WEBP, etc.)
3. Choose OCR provider (or use default)
4. Review extracted text
5. Save to your library

### Document with Images

When importing PDFs or documents containing images:
1. Enable "Extract images for OCR" in import settings
2. Incrementum will process embedded images
3. Extracted text is appended to the document

---

## Language Support

### Tesseract Languages

Tesseract supports 100+ languages. Common codes:

| Code | Language | Code | Language |
|------|----------|------|----------|
| eng | English | chi_sim | Chinese (Simplified) |
| spa | Spanish | chi_tra | Chinese (Traditional) |
| fra | French | jpn | Japanese |
| deu | German | kor | Korean |
| rus | Russian | ara | Arabic |
| por | Portuguese | hin | Hindi |
| ita | Italian | tha | Thai |

**Install additional languages:**
```bash
# Ubuntu/Debian
sudo apt install tesseract-ocr-[lang]

# macOS
brew install tesseract-lang
```

### Cloud Providers

Google Cloud Vision, AWS Textract, and AI providers support most languages automatically without additional setup.

---

## OCR Best Practices

### Image Quality Tips

| Factor | Recommendation |
|--------|---------------|
| Resolution | Minimum 300 DPI for documents |
| Lighting | Even, glare-free illumination |
| Contrast | High contrast between text and background |
| Orientation | Straight-on angle, minimal skew |
| Cropping | Include only relevant text areas |

### Improving Accuracy

1. **Pre-process images**:
   - Crop to text area only
   - Increase contrast if text is faint
   - Straighten rotated images

2. **Choose the right provider**:
   - Clear printed text: Tesseract (free, private)
   - Handwriting: GPT-4o Vision or Google Cloud
   - Equations: Mathpix
   - Tables/forms: AWS Textract

3. **Language settings**:
   - Set correct language for Tesseract
   - Use auto-detect for cloud providers

4. **Review and edit**:
   - Always proofread OCR output
   - Common errors: `0` vs `O`, `1` vs `l`, `5` vs `S`

---

## Cost Considerations

### Free Options

| Provider | Cost | Limitations |
|----------|------|-------------|
| Tesseract | Free | Requires local installation, lower accuracy on poor quality images |

### Cloud Pricing (as of 2026)

| Provider | Pricing Model | Approximate Cost |
|----------|--------------|------------------|
| Google Cloud Vision | Per 1000 pages | $1.50 - $3.50 |
| AWS Textract | Per page | $0.0015 - $0.06 |
| Mistral OCR | Per token | Varies by image size |
| Mathpix | Per request | $0.02 per image |
| GPT-4o Vision | Per token | ~$0.005 - $0.015 per image |
| Claude Vision | Per token | ~$0.003 - $0.015 per image |

**Tip**: Use Tesseract for routine tasks and cloud providers for difficult images or when accuracy is critical.

---

## Troubleshooting

### Common Issues

**"Tesseract not found"**
- Ensure Tesseract is installed and in PATH
- Or set the path manually in Settings → OCR

**Poor recognition accuracy**
- Check image quality (resolution, contrast)
- Verify correct language is selected
- Try a different OCR provider
- Pre-process image (crop, enhance contrast)

**Cloud API errors**
- Verify API key is correct
- Check internet connection
- Review API quota/limits
- Ensure billing is enabled (cloud providers)

**Slow processing**
- Large images: Resize before OCR
- Try Tesseract for faster local processing
- Disable unnecessary OCR features

**Handwriting not recognized**
- Use GPT-4o Vision or Google Cloud
- Tesseract has limited handwriting support
- Ensure clear, legible writing

---

## Privacy Considerations

| Provider | Data Privacy |
|----------|-------------|
| Tesseract | ✅ Local processing - most private |
| Google Cloud Vision | ⚠️ Sent to Google servers |
| AWS Textract | ⚠️ Sent to AWS servers |
| Mistral OCR | ⚠️ Sent to Mistral servers |
| Mathpix | ⚠️ Sent to Mathpix servers |
| GPT-4o | ⚠️ Sent to OpenAI servers |
| Claude | ⚠️ Sent to Anthropic servers |

**Recommendation**: Use Tesseract for sensitive documents.

---

## Advanced Features

### Batch OCR

Process multiple images at once:
1. Select multiple images in import dialog
2. OCR runs on all images sequentially
3. Review extracted text for each

### OCR with AI Enhancement

Combine OCR with AI for better results:
1. Extract text with OCR
2. Use AI features to:
   - Correct OCR errors
   - Format and structure text
   - Generate summaries
   - Create flashcards

### Custom OCR Workflows

Create automated OCR pipelines:
1. Screenshot capture → OCR → Auto-create extract
2. Image import → OCR → Generate flashcards
3. Document scan → OCR → Summarize → Create cards

---

## API Reference (for Developers)

### Rust Backend

```rust
// Example: OCR command
#[tauri::command]
async fn ocr_image(
    image_path: String,
    provider: OcrProvider,
    language: Option<String>,
) -> Result<String, String> {
    // Implementation
}
```

### TypeScript Frontend

```typescript
// Example: OCR API call
const extractedText = await invoke('ocr_image', {
  imagePath: '/path/to/image.png',
  provider: 'tesseract',
  language: 'eng'
});
```

---

## Future Enhancements

Planned OCR improvements:

- [ ] On-device ML models (no cloud required)
- [ ] Real-time camera OCR
- [ ] Batch processing improvements
- [ ] Custom model training
- [ ] Better handwriting recognition (local)

---

*Last updated: January 2026*
