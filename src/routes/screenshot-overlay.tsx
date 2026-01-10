import type { MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

type CaptureMode = "region" | "screen" | "app";

type DragState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
} | null;

function getOverlayParams() {
  const hash = window.location.hash;
  const query = hash.includes("?") ? hash.split("?")[1] : "";
  const params = new URLSearchParams(query);
  const screenIndex = Number(params.get("screen") ?? "0");
  const scaleFactor = Number(params.get("scale") ?? window.devicePixelRatio ?? 1);

  return {
    screenIndex: Number.isFinite(screenIndex) ? screenIndex : 0,
    scaleFactor: Number.isFinite(scaleFactor) ? scaleFactor : 1,
  };
}

export default function ScreenshotOverlay() {
  const { screenIndex, scaleFactor } = useMemo(() => getOverlayParams(), []);
  const [mode, setMode] = useState<CaptureMode>("region");
  const [dragState, setDragState] = useState<DragState>(null);

  const cancel = useCallback(async () => {
    await emit("screenshot-cancel");
    await getCurrentWindow().close();
  }, []);

  const finalizeSelection = useCallback(
    async (selectionMode: CaptureMode, rect?: { x: number; y: number; width: number; height: number }) => {
      await emit("screenshot-selection", {
        mode: selectionMode,
        screenIndex,
        rect,
      });
      await getCurrentWindow().close();
    },
    [screenIndex]
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancel();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cancel]);

  const startDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (mode !== "region") return;
    setDragState({
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    });
  };

  const updateDrag = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragState || mode !== "region") return;
    setDragState({
      ...dragState,
      currentX: event.clientX,
      currentY: event.clientY,
    });
  };

  const endDrag = async () => {
    if (!dragState || mode !== "region") return;

    const x1 = dragState.startX;
    const y1 = dragState.startY;
    const x2 = dragState.currentX;
    const y2 = dragState.currentY;

    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    setDragState(null);

    if (width < 4 || height < 4) {
      return;
    }

    await finalizeSelection("region", {
      x: Math.round(left * scaleFactor),
      y: Math.round(top * scaleFactor),
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor),
    });
  };

  const selectionStyle = useMemo(() => {
    if (!dragState) return null;

    const left = Math.min(dragState.startX, dragState.currentX);
    const top = Math.min(dragState.startY, dragState.currentY);
    const width = Math.abs(dragState.currentX - dragState.startX);
    const height = Math.abs(dragState.currentY - dragState.startY);

    return {
      left,
      top,
      width,
      height,
    };
  }, [dragState]);

  return (
    <div
      className="fixed inset-0 cursor-crosshair bg-black/35 text-white"
      onMouseDown={startDrag}
      onMouseMove={updateDrag}
      onMouseUp={endDrag}
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 cursor-default"
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
      >
        <button
          className={`px-3 py-1 rounded-full text-xs uppercase tracking-wide ${
            mode === "region" ? "bg-white text-black" : "bg-white/10"
          }`}
          onClick={() => setMode("region")}
        >
          Region
        </button>
        <button
          className={`px-3 py-1 rounded-full text-xs uppercase tracking-wide ${
            mode === "app" ? "bg-white text-black" : "bg-white/10"
          }`}
          onClick={() => {
            setMode("app");
            finalizeSelection("app");
          }}
        >
          App Window
        </button>
        <button
          className={`px-3 py-1 rounded-full text-xs uppercase tracking-wide ${
            mode === "screen" ? "bg-white text-black" : "bg-white/10"
          }`}
          onClick={() => {
            setMode("screen");
            finalizeSelection("screen");
          }}
        >
          Full Screen
        </button>
        <button
          className="px-3 py-1 rounded-full text-xs uppercase tracking-wide bg-white/10"
          onClick={cancel}
        >
          Cancel
        </button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-wide text-white/80">
        {mode === "region"
          ? "Drag to select a region"
          : mode === "app"
          ? "Capture the Incrementum window"
          : "Capture the full screen"}
      </div>

      {selectionStyle && (
        <div className="absolute border border-white/90 bg-white/10" style={selectionStyle} />
      )}
    </div>
  );
}
