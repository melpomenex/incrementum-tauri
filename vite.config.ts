import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import path from "path";

// @ts-expect-error process is a nodejs global
const rawHost = process.env.TAURI_DEV_HOST;
const host = rawHost === "localhost" ? "127.0.0.1" : rawHost;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const isProd = mode === "production";
  const isTauriBuild = Boolean(
    process.env.TAURI_DEV_HOST ||
      process.env.TAURI_PLATFORM ||
      process.env.TAURI_ARCH ||
      process.env.TAURI_FAMILY
  );
  const isPWA = mode === "pwa" || (!isTauriBuild && isProd);

  const plugins = [react(), tailwindcss(), wasm()];

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // Use relative asset paths so the production build works with
    // Tauri's custom protocol and when opening the file directly.
    // Always use relative paths to avoid CORS issues with dynamic imports.
    base: "./",

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
      // Force HMR to a fixed port to avoid handshake issues in the Tauri webview.
      hmr: isTauriBuild
        ? false
        : {
          protocol: "ws",
          host: host || "127.0.0.1",
          port: 15174,
          clientPort: 15174,
        },
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
      // For Tauri, inline everything to avoid CORS issues with dynamic imports
      modulePreload: isPWA || !isProd,
      cssCodeSplit: isPWA || !isProd,
      rollupOptions: {
        output:
          isProd && !isPWA
            ? {
              // Inline all dynamic imports for Tauri to avoid CORS issues
              inlineDynamicImports: true,
            }
            : {
              manualChunks: (id) => {
                // Don't split lazy-loaded tab components - keep them in the main bundle
                // to avoid dynamic import issues in Tauri
                if (id.includes("DocumentQATab") || id.includes("tabs/")) {
                  return undefined;
                }
                // Vendor chunks for large libraries
                if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
                  return "react-vendor";
                }
                if (id.includes("node_modules/@tanstack/react-query")) {
                  return "query-vendor";
                }
                if (id.includes("node_modules/pdfjs-dist")) {
                  return "pdf-vendor";
                }
                if (id.includes("node_modules/epubjs")) {
                  return "epub-vendor";
                }
                if (id.includes("node_modules/lucide-react")) {
                  return "ui-vendor";
                }
                if (id.includes("node_modules/zustand")) {
                  return "zustand";
                }
                return undefined;
              },
            },
      },
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      // Force re-optimization in Tauri dev to avoid stale pre-bundles.
      force: isTauriBuild,
    },
  };
});
