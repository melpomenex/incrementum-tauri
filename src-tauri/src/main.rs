// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Linux WebKitGTK workarounds for "Failed to create GBM buffer" and white screen
    #[cfg(target_os = "linux")]
    {
        // Disable DMA-BUF renderer (fixes EGL display issues)
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        // Disable compositing mode (fixes white screen issues)
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        // Disable sandbox (can cause issues in some environments)
        std::env::set_var("WEBKIT_FORCE_SANDBOX", "0");
        // Use software rendering as fallback
        std::env::set_var("WEBKIT_USE_SURFACE_RENDERING", "1");
    }
    incrementum_tauri_lib::run()
}
