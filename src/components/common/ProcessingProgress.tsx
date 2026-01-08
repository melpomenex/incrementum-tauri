/**
 * Processing Progress Indicator Component
 * Shows progress for document processing operations
 */

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
  error?: string;
}

interface ProcessingProgressProps {
  steps: ProcessingStep[];
  title?: string;
  onComplete?: () => void;
  onClose?: () => void;
}

export function ProcessingProgress({
  steps,
  title = "Processing Document...",
  onComplete,
  onClose,
}: ProcessingProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Find the first processing step
    const processingIndex = steps.findIndex((s) => s.status === "processing");
    if (processingIndex !== -1) {
      setCurrentStepIndex(processingIndex);
    }

    // Check if all steps are complete
    const allComplete = steps.every((s) => s.status === "completed" || s.status === "error");
    if (allComplete && !isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [steps, isComplete, onComplete]);

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case "pending":
        return (
          <div className="w-6 h-6 rounded-full border-2 border-muted flex items-center justify-center">
            <div className="w-2 h-2 bg-muted rounded-full" />
          </div>
        );
      case "processing":
        return (
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        );
      case "completed":
        return (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        );
      case "error":
        return (
          <XCircle className="w-6 h-6 text-destructive" />
        );
    }
  };

  const hasErrors = steps.some((s) => s.status === "error");
  const allComplete = steps.every((s) => s.status === "completed" || s.status === "error");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : allComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            )}
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          {allComplete && onClose && (
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{
                width: `${(steps.filter((s) => s.status === "completed" || s.status === "error").length / steps.length) * 100}%`
              }}
            />
          </div>
          <div className="mt-2 text-sm text-muted-foreground text-center">
            {steps.filter((s) => s.status === "completed" || s.status === "error").length} of {steps.length} steps completed
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                step.status === "processing" ? "bg-primary/10" : ""
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  step.status === "processing" ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {step.label}
                </p>
                {step.status === "processing" && (
                  <p className="text-xs text-muted-foreground mt-1">Processing...</p>
                )}
                {step.status === "error" && step.error && (
                  <p className="text-xs text-destructive mt-1">{step.error}</p>
                )}
                {step.status === "completed" && (
                  <p className="text-xs text-green-500 mt-1">Complete</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {allComplete && onClose && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {hasErrors ? "Close (Some Steps Failed)" : "Done"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage processing steps
 */
export function useProcessingProgress(initialSteps: ProcessingStep[]) {
  const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps);

  const updateStep = (id: string, updates: Partial<ProcessingStep>) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === id ? { ...step, ...updates } : step
      )
    );
  };

  const startStep = (id: string) => {
    updateStep(id, { status: "processing" });
  };

  const completeStep = (id: string) => {
    updateStep(id, { status: "completed" });
  };

  const failStep = (id: string, error: string) => {
    updateStep(id, { status: "error", error });
  };

  const resetSteps = () => {
    setSteps(initialSteps);
  };

  return {
    steps,
    updateStep,
    startStep,
    completeStep,
    failStep,
    resetSteps,
  };
}
