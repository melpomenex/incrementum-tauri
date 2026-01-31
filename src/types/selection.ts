export interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PdfRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PdfSelectionPage {
  pageNumber: number;
  viewportRects: ViewportRect[];
  pdfRects: PdfRect[];
}

export interface PdfSelectionContext {
  type: "pdf";
  documentId: string;
  fingerprint?: string | null;
  pages: PdfSelectionPage[];
}
