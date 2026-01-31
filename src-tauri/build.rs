fn main() {
    // On macOS, the system SQLite lacks certain symbols that sqlx needs
    // Use Homebrew's SQLite static library which has all required features
    println!("cargo:rerun-if-changed=build.rs");

    let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default();
    if target_os == "macos" {
        // Find Homebrew SQLite static library
        let common_paths = [
            "/opt/homebrew/opt/sqlite", // Apple Silicon
            "/usr/local/opt/sqlite",     // Intel
        ];

        for path in &common_paths {
            let static_lib = format!("{}/lib/libsqlite3.a", path);

            if std::path::Path::new(&static_lib).exists() {
                println!("cargo:rustc-link-search=native={}/lib", path);
                println!("cargo:rustc-link-lib=static=sqlite3");
                println!("cargo:rustc-link-lib=sqlite3");
                break;
            }
        }
    }

    tauri_build::build()
}
