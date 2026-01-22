export type PdfDest = {
  kind: "XYZ";
  left: number | null;
  top: number | null;
  zoom: number | null;
};

export type ViewState = {
  docId: string;
  pageNumber: number;
  scale: number;
  zoomMode?: "custom" | "fit-width" | "fit-page";
  rotation?: number;
  viewMode?: string;
  dest?: PdfDest | null;
  scrollTop?: number | null;
  scrollPercent?: number | null;
  updatedAt: number;
  version?: number;
};
