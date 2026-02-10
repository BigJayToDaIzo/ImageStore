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

fn start_server(app: &tauri::AppHandle) -> Result<Child, Box<dyn std::error::Error>> {
    let resource_dir = app
        .path()
        .resource_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap());

    let node_bin = resource_dir.join("node");
    let server_entry = resource_dir.join("dist").join("server").join("entry.mjs");

    if !node_bin.exists() {
        return Err(format!("Node binary not found at: {}", node_bin.display()).into());
    }
    if !server_entry.exists() {
        return Err(format!("Server entry not found at: {}", server_entry.display()).into());
    }

    eprintln!("Starting node: {} {}", node_bin.display(), server_entry.display());

    let child = Command::new(&node_bin)
        .arg(&server_entry)
        .env("HOST", "localhost")
        .env("PORT", "4321")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()?;

    Ok(child)
}

fn log_child_output(child: &mut Child) {
    use std::io::{BufRead, BufReader};

    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    println!("[node] {}", line);
                }
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(line) = line {
                    eprintln!("[node] {}", line);
                }
            }
        });
    }
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
            if cfg!(debug_assertions) {
                log::info!("Dev mode — server managed by beforeDevCommand");
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            } else {
                match start_server(app.handle()) {
                    Ok(mut child) => {
                        log_child_output(&mut child);
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
