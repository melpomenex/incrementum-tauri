/**
 * OCR Settings
 * Configure Optical Character Recognition providers and options
 */

import { ScanText, Languages, Cloud, Server, Eye, Zap, FileText, Brain } from "lucide-react";
import { useSettingsStore } from "../../stores/settingsStore";

interface OCRSettingsProps {
  settings: {
    provider: "tesseract" | "google" | "aws" | "azure" | "marker" | "nougat";
    language: string;
    autoOCR: boolean;
    googleProjectId?: string;
    googleLocation?: string;
    googleProcessorId?: string;
    googleCredentialsPath?: string;
    awsRegion?: string;
    awsAccessKey?: string;
    awsSecretKey?: string;
    azureEndpoint?: string;
    azureApiKey?: string;
    preferLocal: boolean;
    mathOcrEnabled: boolean;
    mathOcrCommand?: string;
    mathOcrModelDir?: string;
    keyPhraseExtraction: boolean;
    autoExtractOnLoad: boolean;
  };
  onUpdateSettings: (updates: Partial<OCRSettingsProps["settings"]>) => void;
}

const OCR_PROVIDERS = [
  {
    id: "tesseract",
    name: "Tesseract (Local)",
    description: "Open-source OCR engine running locally",
    icon: Server,
    isCloud: false,
  },
  {
    id: "google",
    name: "Google Document AI",
    description: "Google's cloud-based document AI service",
    icon: Cloud,
    isCloud: true,
  },
  {
    id: "aws",
    name: "AWS Textract",
    description: "Amazon's text extraction service",
    icon: Cloud,
    isCloud: true,
  },
  {
    id: "azure",
    name: "Azure Computer Vision",
    description: "Microsoft's vision API",
    icon: Cloud,
    isCloud: true,
  },
  {
    id: "marker",
    name: "Marker (Local)",
    description: "Convert PDFs to markdown locally",
    icon: FileText,
    isCloud: false,
  },
  {
    id: "nougat",
    name: "Nougat (Local)",
    description: "OCR for scientific documents with math",
    icon: Brain,
    isCloud: false,
  },
];

const SUPPORTED_LANGUAGES = [
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "ita", name: "Italian" },
  { code: "por", name: "Portuguese" },
  { code: "rus", name: "Russian" },
  { code: "chi_sim", name: "Chinese (Simplified)" },
  { code: "chi_tra", name: "Chinese (Traditional)" },
  { code: "jpn", name: "Japanese" },
  { code: "kor", name: "Korean" },
  { code: "ara", name: "Arabic" },
  { code: "hin", name: "Hindi" },
];

const MATH_OCR_MODELS = [
  { id: "pix2tex", name: "pix2tex (LaTeX-OCR)" },
  { id: "nougat", name: "Nougat (Meta)" },
  { id: "latex-ocr", name: "LaTeX-OCR" },
];

export function OCRSettings({ settings, onUpdateSettings }: OCRSettingsProps) {
  const selectedProvider = OCR_PROVIDERS.find((p) => p.id === settings.provider);
  const ProviderIcon = selectedProvider?.icon || ScanText;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ScanText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">OCR Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure optical character recognition for documents
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Auto-OCR Toggle */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Auto-OCR</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Automatically OCR images and scanned documents on import
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoOCR: !settings.autoOCR })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoOCR ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.autoOCR ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <ProviderIcon className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">OCR Provider</div>
              <div className="text-xs text-muted-foreground">
                Select the OCR engine to use
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {OCR_PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              return (
                <button
                  key={provider.id}
                  onClick={() => onUpdateSettings({ provider: provider.id as any })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    settings.provider === provider.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{provider.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Selection */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <Languages className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">OCR Language</div>
              <div className="text-xs text-muted-foreground">
                Primary language for text recognition
              </div>
            </div>
          </div>
          <select
            value={settings.language}
            onChange={(e) => onUpdateSettings({ language: e.target.value })}
            disabled={!settings.autoOCR}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Google Document AI Configuration */}
        {settings.provider === "google" && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Cloud className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Google Document AI</div>
                <div className="text-xs text-muted-foreground">
                  Configure Google Cloud Document AI credentials
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Project ID
                </label>
                <input
                  type="text"
                  value={settings.googleProjectId || ""}
                  onChange={(e) => onUpdateSettings({ googleProjectId: e.target.value })}
                  placeholder="your-project-id"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={settings.googleLocation || "us"}
                  onChange={(e) => onUpdateSettings({ googleLocation: e.target.value })}
                  placeholder="us"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Processor ID
                </label>
                <input
                  type="text"
                  value={settings.googleProcessorId || ""}
                  onChange={(e) => onUpdateSettings({ googleProcessorId: e.target.value })}
                  placeholder="your-processor-id"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Credentials Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.googleCredentialsPath || ""}
                    onChange={(e) => onUpdateSettings({ googleCredentialsPath: e.target.value })}
                    placeholder="/path/to/credentials.json"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={() => {
                      // Trigger file picker for credentials
                      window.api?.file?.openFileDialog?.({
                        filters: [{ name: "JSON", extensions: ["json"] }],
                      })?.then((path: string) => {
                        if (path) onUpdateSettings({ googleCredentialsPath: path });
                      });
                    }}
                    className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                  >
                    Browse
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AWS Textract Configuration */}
        {settings.provider === "aws" && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Cloud className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">AWS Textract</div>
                <div className="text-xs text-muted-foreground">
                  Configure AWS credentials for text extraction
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  AWS Region
                </label>
                <select
                  value={settings.awsRegion || "us-east-1"}
                  onChange={(e) => onUpdateSettings({ awsRegion: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="us-east-1">us-east-1</option>
                  <option value="us-west-2">us-west-2</option>
                  <option value="eu-west-1">eu-west-1</option>
                  <option value="ap-southeast-1">ap-southeast-1</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Access Key ID
                </label>
                <input
                  type="password"
                  value={settings.awsAccessKey || ""}
                  onChange={(e) => onUpdateSettings({ awsAccessKey: e.target.value })}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Secret Access Key
                </label>
                <input
                  type="password"
                  value={settings.awsSecretKey || ""}
                  onChange={(e) => onUpdateSettings({ awsSecretKey: e.target.value })}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Azure Computer Vision Configuration */}
        {settings.provider === "azure" && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Cloud className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Azure Computer Vision</div>
                <div className="text-xs text-muted-foreground">
                  Configure Azure Vision API credentials
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Endpoint
                </label>
                <input
                  type="text"
                  value={settings.azureEndpoint || ""}
                  onChange={(e) => onUpdateSettings({ azureEndpoint: e.target.value })}
                  placeholder="https://your-resource.cognitiveservices.azure.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={settings.azureApiKey || ""}
                  onChange={(e) => onUpdateSettings({ azureApiKey: e.target.value })}
                  placeholder="your-api-key"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Local OCR Options */}
        {(settings.provider === "tesseract" || settings.provider === "marker" || settings.provider === "nougat") && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">Local Processing</div>
                <div className="text-xs text-muted-foreground">
                  Configure local OCR engine options
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Prefer Local OCR</p>
                <p className="text-xs text-muted-foreground">
                  Always use local processing even when cloud providers are available
                </p>
              </div>
              <button
                onClick={() => onUpdateSettings({ preferLocal: !settings.preferLocal })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.preferLocal ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.preferLocal ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Math OCR Configuration */}
        {(settings.provider === "nougat" || settings.mathOcrEnabled) && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">Math OCR</div>
                  <div className="text-xs text-muted-foreground">
                    Extract mathematical equations and formulas
                  </div>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ mathOcrEnabled: !settings.mathOcrEnabled })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.mathOcrEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.mathOcrEnabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {settings.mathOcrEnabled && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    OCR Model
                  </label>
                  <select
                    value={settings.mathOcrCommand || "nougat"}
                    onChange={(e) => onUpdateSettings({ mathOcrCommand: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {MATH_OCR_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Model Directory (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.mathOcrModelDir || ""}
                      onChange={(e) => onUpdateSettings({ mathOcrModelDir: e.target.value })}
                      placeholder="/path/to/models"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => {
                        window.api?.file?.openFileDialog?.({
                          directory: true,
                        })?.then((path: string) => {
                          if (path) onUpdateSettings({ mathOcrModelDir: path });
                        });
                      }}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Key Phrase Extraction */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Key Phrase Extraction</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Automatically extract important keywords and phrases
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ keyPhraseExtraction: !settings.keyPhraseExtraction })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.keyPhraseExtraction ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.keyPhraseExtraction ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Auto-Extract on Document Load */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Auto-Extract on Load</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Automatically extract content when opening documents
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoExtractOnLoad: !settings.autoExtractOnLoad })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoExtractOnLoad ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.autoExtractOnLoad ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary">
            <strong>Note:</strong> Local OCR providers (Tesseract, Marker, Nougat) process
            documents on your computer. Cloud providers (Google, AWS, Azure) may incur costs
            and require internet access.
          </p>
        </div>
      </div>
    </div>
  );
}
