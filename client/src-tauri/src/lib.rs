use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct ServerProcess(Mutex<Option<CommandChild>>);

impl Drop for ServerProcess {
    fn drop(&mut self) {
        if let Some(child) = self.0.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
}

fn start_server(app: &tauri::AppHandle) -> Result<CommandChild, Box<dyn std::error::Error>> {
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap());

    let server_entry = resource_dir.join("dist").join("server").join("entry.mjs");

    let (mut rx, child) = app
        .shell()
        .sidecar("binaries/node")?
        .arg(server_entry.to_string_lossy().to_string())
        .env("HOST", "localhost")
        .env("PORT", "4321")
        .spawn()?;

    // Log sidecar output in background
    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[node] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("[node] {}", String::from_utf8_lossy(&line));
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!("[node] terminated: code={:?} signal={:?}", payload.code, payload.signal);
                    break;
                }
                CommandEvent::Error(err) => {
                    eprintln!("[node] error: {}", err);
                }
                _ => {}
            }
        }
    });

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
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                log::info!("Dev mode — server managed by beforeDevCommand");
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            } else {
                match start_server(app.handle()) {
                    Ok(child) => {
                        app.manage(ServerProcess(Mutex::new(Some(child))));
                        if !wait_for_server(30) {
                            eprintln!("Warning: Astro server did not become ready in time");
                        }
                    }
                    Err(e) => {
                        eprintln!("Failed to start server: {}", e);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
