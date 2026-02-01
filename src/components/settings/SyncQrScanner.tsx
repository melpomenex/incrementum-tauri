import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";

type SyncQrScannerProps = {
  onDetected: (value: string) => void;
  onClose: () => void;
};

export function SyncQrScanner({ onDetected, onClose }: SyncQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scanner: QrScanner | null = null;

    const start = async () => {
      if (!videoRef.current) {
        return;
      }

      try {
        scanner = new QrScanner(
          videoRef.current,
          (result) => {
            onDetected(result.data);
            onClose();
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: "environment",
          }
        );

        await scanner.start();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start camera");
      }
    };

    start();

    return () => {
      scanner?.stop();
      scanner?.destroy();
    };
  }, [onDetected, onClose]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-lg bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">Scan sync code</div>
          <button
            onClick={onClose}
            className="rounded bg-muted px-2 py-1 text-xs text-foreground"
          >
            Close
          </button>
        </div>
        {error ? (
          <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            className="aspect-square w-full rounded border border-border bg-black"
            muted
            playsInline
          />
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          Point your camera at the QR code shown on the desktop web app.
        </div>
      </div>
    </div>
  );
}
