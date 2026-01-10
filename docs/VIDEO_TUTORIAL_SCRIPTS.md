# OCR Video Tutorial Scripts

## Video 1: Introduction to OCR in Incrementum (5 minutes)

### Scene 1: Introduction (0:00-0:30)

**Visual**: Title card "OCR in Incrementum" with background showing document scanning

**Narrator**: Welcome to this tutorial on OCR - Optical Character Recognition - in Incrementum. OCR allows you to extract text from images, scanned documents, and PDFs, making them searchable and editable. Let's get started.

### Scene 2: What is OCR? (0:30-1:30)

**Visual**: Split screen showing image of a document and extracted text

**Narrator**: OCR stands for Optical Character Recognition. It's technology that converts different types of documents - like scanned paper documents, PDF files, or images - into editable and searchable data. Incrementum supports multiple OCR providers, each optimized for different use cases.

### Scene 3: Accessing OCR Settings (1:30-2:30)

**Visual**: Screen recording showing navigation to Settings → Documents → OCR Settings

**Narrator**: To configure OCR, go to Settings, then Documents, and scroll down to OCR Settings. Here you'll see all available options. Let's walk through each one.

### Scene 4: OCR Providers Overview (2:30-3:30)

**Visual**: Animated graphic showing different provider logos with descriptions

**Narrator**: Incrementum supports several OCR providers. For local processing, we have Tesseract, Marker, and Nougat. For cloud-based processing with higher accuracy, we support Google Document AI, AWS Textract, and Azure Computer Vision. Choose local providers for privacy, or cloud providers for maximum accuracy.

### Scene 5: Enabling Auto-OCR (3:30-4:30)

**Visual**: Screen recording showing toggle of Auto-OCR switch

**Narrator**: To automatically process documents when you import them, toggle Auto-OCR to ON. This will extract text from images and scanned PDFs automatically. You can also enable Auto-Extract on Load to process documents when you open them.

### Scene 6: Conclusion (4:30-5:00)

**Visual**: Summary of key points with call-to-action

**Narrator**: In this video, we covered the basics of OCR in Incrementum. In the next video, we'll dive deeper into configuring specific providers and advanced features like Math OCR. Thanks for watching!

---

## Video 2: Configuring OCR Providers (7 minutes)

### Scene 1: Local vs Cloud Providers (0:00-1:00)

**Visual**: Comparison chart showing pros/cons of local vs cloud

**Narrator**: When choosing an OCR provider, you have two main categories: local providers that run on your computer, and cloud providers that process documents on external servers. Local providers offer privacy and work offline, while cloud providers typically offer higher accuracy.

### Scene 2: Setting Up Tesseract (1:00-2:30)

**Visual**: Screen recording of Tesseract installation and configuration

**Narrator**: Tesseract is the most popular open-source OCR engine. On macOS, install it with Homebrew. On Ubuntu, use apt-get. On Windows, download the installer. Once installed, simply select Tesseract as your provider in the settings.

### Scene 3: Setting Up Google Document AI (2:30-4:30)

**Visual**: Step-by-step Google Cloud Console walkthrough

**Narrator**: For Google Document AI, you'll need a Google Cloud project. Go to the console, create a project, enable the Document AI API, and create a processor. Then create a service account and download the credentials JSON. Enter these details in Incrementum's settings.

### Scene 4: Setting Up AWS Textract (4:30-5:30)

**Visual**: AWS Console IAM setup walkthrough

**Narrator**: For AWS Textract, create an IAM user with the AmazonTextractFullAccess policy. Generate access keys and enter them in the settings along with your AWS region.

### Scene 5: Setting Up Marker and Nougat (5:30-6:30)

**Visual**: Terminal commands for installing Marker and Nougat via pip

**Narrator**: Marker converts PDFs to Markdown - install it with pip install marker-pdf. Nougat specializes in scientific documents with math - install it with pip install nougat-ocr. Both work locally and respect your privacy.

### Scene 6: Testing Your Configuration (6:30-7:00)

**Visual**: Importing a test document and showing extracted results

**Narrator**: Once configured, test your setup by importing a document. Navigate to the Documents tab and check that the text was extracted successfully. That's it for configuring OCR providers!

---

## Video 3: Math OCR for Scientific Documents (5 minutes)

### Scene 1: Introduction to Math OCR (0:00-0:45)

**Visual**: Example of scientific paper with mathematical equations

**Narrator**: Scientific documents often contain complex mathematical formulas. Standard OCR struggles with these, but specialized Math OCR can accurately extract equations in LaTeX format.

### Scene 2: Enabling Math OCR (0:45-2:00)

**Visual**: Settings screen showing Math OCR toggle and model selection

**Narrator**: To enable Math OCR, go to OCR Settings and toggle the Math OCR switch. Choose your model - Nougat is recommended for most scientific documents, while pix2tex is great for standalone equations.

### Scene 3: How Math OCR Works (2:00-3:00)

**Visual**: Animated example showing equation → LaTeX conversion

**Narrator**: Math OCR recognizes mathematical symbols and converts them to LaTeX notation. For example, a fraction becomes \frac{numerator}{denominator}, and integrals become \int_{lower}^{upper} expression dx.

### Scene 4: Using Math OCR Results (3:00-4:00)

**Visual**: Document viewer showing math preview and LaTeX export

**Narrator**: Once extracted, you can preview equations in the document viewer, copy LaTeX code for use in papers, or export the entire document with preserved math notation.

### Scene 5: Best Practices (4:00-5:00)

**Visual**: Tips checklist with example good/bad scans

**Narrator**: For best Math OCR results, ensure high-quality scans at 300 DPI or higher, use clear high-contrast images, and avoid shadows or skew. With good input, Math OCR can achieve excellent accuracy on even complex equations.

---

## Video 4: Key Phrase Extraction (4 minutes)

### Scene 1: What is Key Phrase Extraction? (0:00-0:45)

**Visual**: Example document with key phrases highlighted

**Narrator**: Key phrase extraction automatically identifies the most important keywords and phrases in your documents. This helps you quickly understand the main topics and create summaries.

### Scene 2: Enabling Key Phrase Extraction (0:45-1:30)

**Visual**: Settings screen with Key Phrase Extraction toggle

**Narrator**: Enable this feature in OCR Settings by toggling Key Phrase Extraction to ON. It works alongside auto-extract to analyze documents as you import them.

### Scene 3: How the Algorithm Works (1:30-2:30)

**Visual**: Animated explanation of RAKE algorithm

**Narrator**: Incrementum uses the RAKE algorithm - Rapid Automatic Keyword Extraction. It identifies candidate phrases between stop words, calculates word frequencies, and scores phrases based on how often they appear together.

### Scene 4: Practical Uses (2:30-3:30)

**Visual**: Examples of using key phrases for search, tagging, and summarization

**Narrator**: Use key phrases to quickly grasp document topics, enhance search results, automatically tag documents, or generate summaries. The extracted phrases are displayed in the document sidebar.

### Scene 5: Tips and Limitations (3:30-4:00)

**Visual**: Best practices checklist

**Narrator**: Key phrase extraction works best with well-structured text. For very short documents or highly technical content, you may want to adjust the number of phrases extracted. Experiment with different settings for your use case.

---

## Quick Tutorial Series (30-60 seconds each)

### Quick Tip 1: Change OCR Language (30 sec)

**Visual**: Quick screen recording of language dropdown

**Narrator**: To change OCR language, go to Settings → Documents → OCR Settings, and select your language from the dropdown. This improves accuracy for non-English documents.

### Quick Tip 2: Check OCR Accuracy (30 sec)

**Visual**: Comparison of original and extracted text

**Narrator**: To check OCR accuracy, open a document and select some text. Compare it to the original document. If accuracy is low, try a different provider or improve scan quality.

### Quick Tip 3: Use Local OCR for Privacy (30 sec)

**Visual**: Toggle for Prefer Local OCR

**Narrator**: For sensitive documents, enable Prefer Local OCR. This ensures all processing happens on your computer and nothing is sent to external servers.

### Quick Tip 4: Batch Process Documents (45 sec)

**Visual**: Importing multiple documents

**Narrator**: To process multiple documents at once, simply import them all while Auto-OCR is enabled. Each document will be queued and processed sequentially.

### Quick Tip 5: Export OCR Results (30 sec)

**Visual**: Export dialog showing options

**Narrator**: To export OCR results, select a document and choose Export. You can export the extracted text, key phrases, and math notation in various formats.

---

## Production Notes

### Video Style Guidelines

- **Tone**: Informative, friendly, professional
- **Pacing**: Moderate, allow viewer to follow along
- **Visuals**: Screen recordings with cursor highlighting, animated diagrams for concepts
- **Length**: Keep videos concise, under 10 minutes each
- **Captions**: Include for accessibility

### Recording Checklist

- [ ] Clean desktop, close unnecessary apps
- [ ] Use consistent cursor highlighting
- [ ] Test microphone quality beforehand
- [ ] Use 1080p or higher resolution
- [ ] Include mouse click sounds if desired
- [ ] Add intro and outro music (subtle)

### Editing Checklist

- [ ] Trim dead air and mistakes
- [ ] Add zoom highlights for important areas
- [ ] Include text overlays for key terms
- [ ] Add chapter markers for navigation
- [ ] Include captions/subtitles
- [ ] Preview on multiple devices

### Distribution

- Upload to YouTube with descriptive title and tags
- Embed in Incrementum documentation
- Create playlist for all OCR tutorials
- Link from in-app help menu
- Include transcripts for SEO
