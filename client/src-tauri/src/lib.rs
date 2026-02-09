use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

struct ServerProcess(Mutex<Option<Child>>);

impl Drop for ServerProcess {
    fn drop(&mut self) {
        if let Some(mut child) = self.0.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
}

fn start_server(app: &tauri::App) -> Result<Child, Box<dyn std::error::Error>> {
    // In dev mode, beforeDevCommand starts the Astro server — nothing to spawn
    if cfg!(debug_assertions) {
        return Err("Dev mode — server managed by Tauri".into());
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap());

    let server_entry = resource_dir.join("dist").join("server").join("entry.mjs");

    let child = Command::new("node")
        .arg(&server_entry)
        .current_dir(&resource_dir)
        .env("HOST", "localhost")
        .env("PORT", "4321")
        .spawn()?;

    Ok(child)
}

fn wait_for_server(max_attempts: u32) -> bool {
    for _ in 0..max_attempts {
        if let Ok(resp) = reqwest::blocking::get("http://localhost:4321") {
            if resp.status().is_success() {
                return true;
            }
        }
        std::thread::sleep(Duration::from_millis(300));
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            match start_server(app) {
                Ok(child) => {
                    app.manage(ServerProcess(Mutex::new(Some(child))));
                    if !wait_for_server(30) {
                        eprintln!("Warning: Astro server did not become ready in time");
                    }
                }
                Err(e) => {
                    if cfg!(debug_assertions) {
                        log::info!("Dev mode: {}", e);
                    } else {
                        eprintln!("Failed to start server: {}", e);
                    }
                }
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
