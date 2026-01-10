/**
 * OCR Onboarding Component
 * Interactive guide for new OCR features
 */

import { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ScanText,
  Settings,
  Zap,
  Brain,
  FileText,
  Check,
  Sparkles,
} from "lucide-react";

interface OCROnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: () => void;
  actionLabel?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to Enhanced OCR",
    description: "Incrementum now includes powerful OCR capabilities with multiple providers, math support, and automatic key phrase extraction. Let's take a quick tour!",
    icon: Sparkles,
  },
  {
    id: "providers",
    title: "Choose Your OCR Provider",
    description: "Select from Tesseract (local), Google Document AI, AWS Textract, Azure, Marker (PDF to Markdown), or Nougat (scientific documents). Local providers respect your privacy, while cloud providers offer higher accuracy.",
    icon: ScanText,
  },
  {
    id: "auto-ocr",
    title: "Enable Auto-OCR",
    description: "Turn on Auto-OCR to automatically extract text from imported images and scanned documents. You can also enable Auto-Extract on Load to process documents when you open them.",
    icon: Zap,
  },
  {
    id: "math-ocr",
    title: "Math OCR for Scientific Documents",
    description: "Nougat specializes in extracting mathematical equations and formulas from scientific papers, textbooks, and academic documents. Outputs LaTeX format for use in papers.",
    icon: Brain,
  },
  {
    id: "key-phrases",
    title: "Key Phrase Extraction",
    description: "Automatically identify important keywords and topics in your documents using the RAKE algorithm. Perfect for summarization and search enhancement.",
    icon: FileText,
  },
  {
    id: "settings",
    title: "Configure Your Settings",
    description: "Access all OCR options in Settings → Documents → OCR Settings. Configure providers, languages, and processing options to match your workflow.",
    icon: Settings,
  },
];

export function OCROnboarding({ onComplete, onSkip }: OCROnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const step = onboardingSteps[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  const handleNext = () => {
    // Mark current step as completed
    setCompletedSteps(new Set(completedSteps).add(step.id));

    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/20 to-primary/5 p-6">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground/60" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-primary/20 rounded-xl">
              <StepIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {onboardingSteps.length}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-lg text-foreground leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Step-specific content */}
          {step.id === "providers" && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { name: "Tesseract", type: "Local", desc: "General OCR" },
                { name: "Google", type: "Cloud", desc: "High accuracy" },
                { name: "Marker", type: "Local", desc: "PDF → Markdown" },
                { name: "Nougat", type: "Local", desc: "Math & science" },
              ].map((provider) => (
                <div
                  key={provider.name}
                  className="p-3 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground text-sm">
                      {provider.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full">
                      {provider.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.desc}</p>
                </div>
              ))}
            </div>
          )}

          {step.id === "auto-ocr" && (
            <div className="space-y-3 mb-6">
              {[
                { feature: "Auto-OCR on import", desc: "Process images automatically" },
                { feature: "Auto-Extract on load", desc: "Extract when opening documents" },
                { feature: "Key phrase extraction", desc: "Identify important topics" },
              ].map((item) => (
                <div
                  key={item.feature}
                  className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="p-1 bg-primary/20 rounded mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground text-sm">
                      {item.feature}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step.id === "math-ocr" && (
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">Math OCR Example</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Image</div>
                  <div className="bg-background rounded p-3 text-center text-2xl">
                    ∫₀¹ x² dx
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">LaTeX Output</div>
                  <code className="block bg-background rounded p-3 text-sm">
                    \int_0^1 x^2 dx
                  </code>
                </div>
              </div>
            </div>
          )}

          {step.id === "key-phrases" && (
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <div className="text-xs text-muted-foreground mb-2">Example Extraction</div>
              <div className="flex flex-wrap gap-2">
                {["Machine learning", "Neural networks", "Optimization", "Data science"].map(
                  (phrase) => (
                    <span
                      key={phrase}
                      className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm"
                    >
                      {phrase}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {onboardingSteps.map((s, index) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-primary w-8"
                    : completedSteps.has(s.id)
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-foreground/70 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-foreground/70 hover:text-foreground transition-colors"
            >
              Skip tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {isLastStep ? "Get Started" : "Next"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if OCR onboarding should be shown
 */
export function useOCROnboarding() {
  const [shouldShow, setShouldShow] = useState(false);

  // Check if onboarding was completed before
  useState(() => {
    const completed = localStorage.getItem("ocr_onboarding_completed");
    const settingsVersion = localStorage.getItem("ocr_settings_version");

    // Show onboarding if not completed or if settings were updated
    if (!completed || settingsVersion !== "1.0") {
      setShouldShow(true);
    }
  });

  const markCompleted = () => {
    localStorage.setItem("ocr_onboarding_completed", "true");
    localStorage.setItem("ocr_settings_version", "1.0");
    setShouldShow(false);
  };

  return { shouldShow, markCompleted };
}

/**
 * OCR Feature Highlight Component
 * Shows highlights for new OCR features in the UI
 */
interface OCRFeatureHighlightProps {
  feature: "provider" | "auto-ocr" | "math-ocr" | "key-phrases";
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function OCRFeatureHighlight({
  feature,
  children,
  position = "bottom",
}: OCRFeatureHighlightProps) {
  const [dismissed, setDismissed] = useState(false);

  const highlights = {
    provider: {
      title: "New: Multiple OCR Providers!",
      description: "Choose from Tesseract, Google, AWS, Azure, Marker, or Nougat",
    },
    "auto-ocr": {
      title: "New: Auto-OCR",
      description: "Automatically extract text when importing documents",
    },
    "math-ocr": {
      title: "New: Math OCR",
      description: "Extract mathematical equations with LaTeX output",
    },
    "key-phrases": {
      title: "New: Key Phrase Extraction",
      description: "Automatically identify important topics in your documents",
    },
  };

  if (dismissed) {
    return <>{children}</>;
  }

  const highlight = highlights[feature];

  return (
    <div className="relative inline-block">
      {children}

      {/* Pulse effect */}
      <div className="absolute inset-0 -m-1 rounded-lg bg-primary/20 animate-pulse pointer-events-none" />

      {/* Tooltip */}
      <div
        className={`absolute z-50 w-64 p-3 bg-popover border border-border rounded-lg shadow-lg ${
          position === "bottom" ? "top-full mt-2" : ""
        }`}
      >
        <div className="flex items-start gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium text-foreground text-sm">{highlight.title}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {highlight.description}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-primary hover:underline"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
