/**
 * Wrapper component that adds Assistant panel to YouTubeViewer
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { YouTubeViewer as BaseYouTubeViewer } from "./YouTubeViewer";
import { AssistantPanel, type AssistantContext, type AssistantPosition } from "../assistant/AssistantPanel";
import { useSettingsStore } from "../../stores";
import { getDeviceInfo } from "../../lib/pwa";
import { trimToTokenWindow } from "../../utils/tokenizer";

const ASSISTANT_POSITION_KEY = "youtube-assistant-panel-position";

interface YouTubeViewerWithAssistantProps {
  videoId: string;
  documentId?: string;
  title?: string;
}

export function YouTubeViewer({ videoId, documentId, title }: YouTubeViewerWithAssistantProps) {
  const [assistantInputActive, setAssistantInputActive] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ text: string; start: number; end: number }>>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selection, setSelection] = useState("");
  const contextWindowTokens = useSettingsStore((state) => state.settings.ai.maxTokens);
  const aiModel = useSettingsStore((state) => state.settings.ai.model);
  const [assistantContent, setAssistantContent] = useState<string | undefined>(undefined);
  const [assistantPosition, setAssistantPosition] = useState<AssistantPosition>(() => {
    const saved = localStorage.getItem(ASSISTANT_POSITION_KEY);
    return saved === "left" ? "left" : "right";
  });
  const deviceInfo = getDeviceInfo();
  const isMobile = deviceInfo.isMobile;

  // Convert transcript to text format for the assistant
  useEffect(() => {
    if (transcript.length === 0) {
      setAssistantContent(undefined);
      return;
    }

    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;
    
    // Format transcript with timestamps for context
    const transcriptText = transcript
      .map((seg) => `[${formatTime(seg.start)}] ${seg.text}`)
      .join("\n");

    const videoContext = `Video: ${title || videoId}\nDuration: ${formatTime(duration)}\n\nTRANSCRIPT:\n${transcriptText}`;

    trimToTokenWindow(videoContext, maxTokens, aiModel)
      .then((trimmed) => {
        setAssistantContent(trimmed);
      })
      .catch(() => {
        // Fallback: truncate by character count
        setAssistantContent(videoContext.slice(0, maxTokens * 4));
      });
  }, [transcript, title, videoId, duration, contextWindowTokens, aiModel]);

  const assistantContext = useMemo<AssistantContext>(() => {
    const maxTokens = contextWindowTokens && contextWindowTokens > 0 ? contextWindowTokens : 2000;
    return {
      type: "video",
      documentId,
      content: assistantContent,
      selection: selection || undefined,
      contextWindowTokens: maxTokens,
      position: {
        currentTime,
      },
      metadata: {
        title: title || undefined,
        duration: duration || undefined,
        videoId,
      },
    };
  }, [assistantContent, documentId, selection, contextWindowTokens, currentTime, title, duration, videoId]);

  const handlePositionChange = (newPosition: AssistantPosition) => {
    setAssistantPosition(newPosition);
    localStorage.setItem(ASSISTANT_POSITION_KEY, newPosition);
  };

  // Handle transcript load from child component
  const handleTranscriptLoad = useCallback((segments: Array<{ text: string; start: number; end: number }>) => {
    setTranscript(segments);
  }, []);

  // Handle time updates from child component
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  // Handle metadata load
  const handleMetadataLoad = useCallback((metadata: { duration: number; title: string }) => {
    setDuration(metadata.duration);
  }, []);

  // Handle transcript selection
  const handleTranscriptSelection = useCallback((text: string) => {
    setSelection(text);
  }, []);

  const assistantPanel = (
    <AssistantPanel
      context={assistantContext}
      className="flex-shrink-0"
      onInputHoverChange={setAssistantInputActive}
      position={assistantPosition}
      onPositionChange={handlePositionChange}
    />
  );

  const youtubeViewer = (
    <div className="flex-1 h-full overflow-hidden">
      <BaseYouTubeViewer
        videoId={videoId}
        documentId={documentId}
        title={title}
        onLoad={handleMetadataLoad}
        onTranscriptLoad={handleTranscriptLoad}
        onTimeUpdate={handleTimeUpdate}
        onSelectionChange={handleTranscriptSelection}
      />
    </div>
  );

  return (
    <div className="flex h-full">
      {isMobile ? (
        youtubeViewer
      ) : assistantPosition === "left" ? (
        <>
          {assistantPanel}
          {youtubeViewer}
        </>
      ) : (
        <>
          {youtubeViewer}
          {assistantPanel}
        </>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hours = Math.floor(mins / 60);
  if (hours > 0) {
    return `${hours}:${(mins % 60).toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
