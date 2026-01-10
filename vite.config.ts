import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const rawHost = process.env.TAURI_DEV_HOST;
const host = rawHost === "localhost" ? "127.0.0.1" : rawHost;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const isProd = mode === "production";

  return ({
  plugins: [react(), tailwindcss()],

  // Use relative asset paths so the production build works with
  // Tauri's custom protocol and when opening the file directly.
  base: "./",

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 15173,
    strictPort: true,
    host: host || "127.0.0.1",
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 15174,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Performance: Code splitting optimization
  build: {
    // Avoid module loading CORS issues when running from file://
    // by emitting a single JS bundle in production.
    modulePreload: !isProd,
    cssCodeSplit: !isProd,
    rollupOptions: {
      output: isProd
        ? {
            inlineDynamicImports: true,
          }
        : {
            manualChunks: {
              // Vendor chunks for large libraries
              "react-vendor": ["react", "react-dom", "react-router-dom"],
              "query-vendor": ["@tanstack/react-query"],
              "pdf-vendor": ["pdfjs-dist"],
              "epub-vendor": ["epubjs"],
              "ui-vendor": ["lucide-react"],
              zustand: ["zustand"],
            },
          },
    },
    chunkSizeWarningLimit: 1000,
  },
});
});
