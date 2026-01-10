/**
 * Math OCR Utilities
 * OCR for mathematical equations and formulas
 */

import { invoke } from "@tauri-apps/api/core";

/**
 * Math OCR model types
 */
export enum MathOCRModel {
  Pix2Tex = "pix2tex",
  Nougat = "nougat",
  LatexOCR = "latex-ocr",
}

/**
 * Math OCR result
 */
export interface MathOCRResult {
  latex: string;
  confidence: number;
  preview_html: string;
  processing_time_ms: number;
  model_used: string;
  success: boolean;
  error?: string;
}

/**
 * Math OCR request
 */
export interface MathOCRRequest {
  image_data: string;
  model: MathOCRModel;
  model_dir?: string;
}

/**
 * Extract mathematical equations from an image using Nougat
 */
export async function extractMathWithNougat(
  imageData: string,
  modelDir?: string
): Promise<MathOCRResult> {
  const start = Date.now();

  try {
    // Call Nougat via Python subprocess
    const result = await invoke<{ latex: string; confidence: number }>("run_nougat_ocr", {
      imageData,
      modelDir,
    });

    const processing_time_ms = Date.now() - start;

    return {
      latex: result.latex,
      confidence: result.confidence,
      preview_html: latexToHTML(result.latex),
      processing_time_ms,
      model_used: "nougat",
      success: true,
    };
  } catch (error) {
    return {
      latex: "",
      confidence: 0,
      preview_html: "",
      processing_time_ms: Date.now() - start,
      model_used: "nougat",
      success: false,
      error: String(error),
    };
  }
}

/**
 * Extract mathematical equations from an image using pix2tex
 */
export async function extractMathWithPix2Tex(
  imageData: string
): Promise<MathOCRResult> {
  const start = Date.now();

  try {
    // Call pix2tex via Python subprocess
    const result = await invoke<{ latex: string; confidence: number }>("run_pix2tex_ocr", {
      imageData,
    });

    const processing_time_ms = Date.now() - start;

    return {
      latex: result.latex,
      confidence: result.confidence,
      preview_html: latexToHTML(result.latex),
      processing_time_ms,
      model_used: "pix2tex",
      success: true,
    };
  } catch (error) {
    return {
      latex: "",
      confidence: 0,
      preview_html: "",
      processing_time_ms: Date.now() - start,
      model_used: "pix2tex",
      success: false,
      error: String(error),
    };
  }
}

/**
 * Convert LaTeX to HTML for preview
 */
export function latexToHTML(latex: string): string {
  // Basic LaTeX to HTML conversion
  // In production, use MathJax or KaTeX for proper rendering
  let html = latex
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span class="fraction"><span class="numerator">$1</span><span class="denominator">$2</span></span>')
    .replace(/\\sqrt\{([^}]+)\}/g, '<span class="sqrt">&radic;<span class="radicand">$1</span></span>')
    .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
    .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
    .replace(/\\pi/g, "&pi;")
    .replace(/\\infty/g, "&infin;")
    .replace(/\\alpha/g, "&alpha;")
    .replace(/\\beta/g, "&beta;")
    .replace(/\\gamma/g, "&gamma;")
    .replace(/\\delta/g, "&delta;")
    .replace(/\\theta/g, "&theta;")
    .replace(/\\sum/g, "&sum;")
    .replace(/\\prod/g, "&prod;")
    .replace(/\\int/g, "&int;");

  return `<span class="math-expression">${html}</span>`;
}

/**
 * Validate LaTeX syntax
 */
export function validateLatex(latex: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  let valid = true;

  // Check for balanced braces
  let braceDepth = 0;
  for (const char of latex) {
    if (char === "{") braceDepth++;
    if (char === "}") braceDepth--;
    if (braceDepth < 0) {
      errors.push("Unmatched closing brace");
      valid = false;
      break;
    }
  }
  if (braceDepth !== 0) {
    errors.push("Unmatched opening brace");
    valid = false;
  }

  // Check for balanced math mode delimiters
  const mathDelimiters = latex.match(/\$\$/g);
  if (mathDelimiters && mathDelimiters.length % 2 !== 0) {
    errors.push("Unmatched $$ delimiters");
    valid = false;
  }

  return { valid, errors };
}

/**
 * Extract all math expressions from text
 */
export function extractMathFromText(text: string): string[] {
  const mathExpressions: string[] = [];

  // Match inline math $...$
  const inlineMath = text.match(/\$([^$]+)\$/g);
  if (inlineMath) {
    inlineMath.forEach((expr) => {
      mathExpressions.push(expr.replace(/\$/g, ""));
    });
  }

  // Match display math $$...$$
  const displayMath = text.match(/\$\$([^$]+)\$\$/g);
  if (displayMath) {
    displayMath.forEach((expr) => {
      mathExpressions.push(expr.replace(/\$\$/g, ""));
    });
  }

  return mathExpressions;
}

/**
 * Detect if text contains mathematical content
 */
export function detectMathContent(text: string): {
  hasMath: boolean;
  confidence: number;
  indicators: string[];
} {
  const indicators: string[] = [];
  let confidence = 0;

  // Math symbols
  const mathSymbols = /[α-ωΑ-Ω∫∑∏√∞±×÷≈≠≤≥∂∇]/;
  if (mathSymbols.test(text)) {
    indicators.push("Math symbols detected");
    confidence += 0.3;
  }

  // Subscripts/superscripts
  const subSuper = /(_|\^)\{|\w_(\d+|[a-z])|\w\^(\d+|[a-z])/;
  if (subSuper.test(text)) {
    indicators.push("Subscripts/superscripts detected");
    confidence += 0.2;
  }

  // Fractions
  const fractions = /\\frac|\d+\/\d+/;
  if (fractions.test(text)) {
    indicators.push("Fractions detected");
    confidence += 0.2;
  }

  // Greek letters
  const greek = /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/;
  if (greek.test(text)) {
    indicators.push("Greek letters detected");
    confidence += 0.15;
  }

  // Math operators
  const operators = /\\(sum|prod|int|lim|sup|inf|min|max)/;
  if (operators.test(text)) {
    indicators.push("Math operators detected");
    confidence += 0.15;
  }

  return {
    hasMath: confidence > 0.3,
    confidence: Math.min(confidence, 1.0),
    indicators,
  };
}

/**
 * Clean up OCR text for math content
 */
export function cleanMathOCR(text: string): string {
  return text
    // Fix common OCR errors
    .replace(/∫/g, "\\int")
    .replace(/∑/g, "\\sum")
    .replace(/∏/g, "\\prod")
    .replace(/√/g, "\\sqrt")
    .replace(/∞/g, "\\infty")
    .replace(/≤/g, "\\leq")
    .replace(/≥/g, "\\geq")
    .replace(/≈/g, "\\approx")
    .replace(/≠/g, "\\neq")
    // Fix spacing
    .replace(/\s+/g, " ")
    .trim();
}
