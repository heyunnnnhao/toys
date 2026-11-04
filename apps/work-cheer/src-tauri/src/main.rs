#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};

#[tauri::command]
async fn open_debug(window: WebviewWindow, simulated_at: Option<i64>) -> Result<(), String> {
    if window.label() != "main" {
        return Err("Only the dashboard can open the debugger".into());
    }
    let app = window.app_handle();
    if let Some(debug) = app.get_webview_window("debug") {
        return debug.set_focus().map_err(|error| error.to_string());
    }
    let url = match simulated_at {
        Some(timestamp) => format!("index.html?simulatedAt={timestamp}"),
        None => "index.html".into(),
    };
    WebviewWindowBuilder::new(app, "debug", WebviewUrl::App(url.into()))
        .title("调试时间")
        .inner_size(405.0, 260.0)
        .resizable(false)
        .center()
        .build()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn set_debug_time(window: WebviewWindow, timestamp: Option<i64>) -> Result<(), String> {
    if window.label() != "debug" {
        return Err("Only the debugger can change the clock".into());
    }
    if timestamp.is_some_and(|value| !(0..=253_402_300_799_999).contains(&value)) {
        return Err("Unsupported timestamp".into());
    }
    let main = window
        .get_webview_window("main")
        .ok_or("Dashboard is closed")?;
    main.emit_to("main", "work-cheer-action", timestamp)
        .map_err(|error| error.to_string())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let submenu = SubmenuBuilder::new(app, "应用")
                .text("settings", "设置…")
                .build()?;
            let menu = MenuBuilder::new(app).item(&submenu).build()?;
            let main = app
                .get_webview_window("main")
                .ok_or("Dashboard window missing")?;
            main.set_menu(menu)?;
            main.on_menu_event(|window, event| {
                if event.id() == "settings" {
                    let _ = window.emit_to("main", "work-cheer-action", "settings");
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                if let Some(debug) = window.get_webview_window("debug") {
                    let _ = debug.close();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![open_debug, set_debug_time])
        .run(tauri::generate_context!())
        .expect("failed to run Work Cheer");
}
