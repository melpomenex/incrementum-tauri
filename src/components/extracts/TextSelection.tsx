import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";

interface TextSelectionProps {
  onExtract: (text: string) => void;
  containerRef: React.RefObject<HTMLElement | HTMLDivElement | null>;
}

export function TextSelection({ onExtract, containerRef }: TextSelectionProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection) return;

      const text = selection.toString().trim();

      if (text && container.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        setSelectedText(text);
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 40,
        });
        setShowTooltip(true);
      } else {
        setShowTooltip(false);
      }
    };

    const handleMouseDown = () => {
      setShowTooltip(false);
    };

    container.addEventListener("mouseup", handleSelection);
    container.addEventListener("mousedown", handleMouseDown);

    return () => {
      container.removeEventListener("mouseup", handleSelection);
      container.removeEventListener("mousedown", handleMouseDown);
    };
  }, [containerRef]);

  const handleExtract = () => {
    if (selectedText) {
      onExtract(selectedText);
      setShowTooltip(false);
      // Clear the selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }
    }
  };

  if (!showTooltip) return null;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 px-3 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translateX(-50%)",
      }}
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-medium">Create Extract</span>
      <button
        onClick={handleExtract}
        className="ml-2 px-2 py-1 bg-primary-foreground text-primary rounded text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        Add
      </button>
    </div>
  );
}
