import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const rawHost = process.env.TAURI_DEV_HOST;
const host = rawHost === "localhost" ? "127.0.0.1" : rawHost;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const isProd = mode === "production";
  const isPWA = mode === "pwa" || (!rawHost && isProd);

  const plugins = [react(), tailwindcss()];

  return {
    plugins,

    // Use relative asset paths so the production build works with
    // Tauri's custom protocol and when opening the file directly.
    base: isPWA ? "/" : "./",

    // Define environment variables
    define: {
      __PWA_MODE__: JSON.stringify(isPWA),
    },

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
        ignored: ["**/src-tauri/**", "**/server/**"],
      },
      // Proxy API requests in development
      proxy: isPWA
        ? {
          "/api": {
            target: "http://localhost:3000",
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ""),
          },
        }
        : undefined,
    },

    // Performance: Code splitting optimization
    build: {
      // For PWA, we can use normal code splitting
      // For Tauri, inline everything to avoid CORS issues
      modulePreload: isPWA || !isProd,
      cssCodeSplit: isPWA || !isProd,
      rollupOptions: {
        output:
          isProd && !isPWA
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
  };
});
