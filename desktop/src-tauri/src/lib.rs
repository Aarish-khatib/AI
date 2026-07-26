use keyring::Entry;

const SERVICE: &str = "com.limitless.ai.desktop";

#[tauri::command]
fn store_device_credential(account: String, credential: String) -> Result<(), String> {
    if account.trim().is_empty() || credential.len() < 32 {
        return Err("A valid device account and rotated credential are required.".into());
    }
    Entry::new(SERVICE, &account)
        .map_err(|_| "Secure credential storage is unavailable.".to_string())?
        .set_password(&credential)
        .map_err(|_| "Credential could not be stored in the operating-system keychain.".to_string())
}

#[tauri::command]
fn remove_device_credential(account: String) -> Result<(), String> {
    Entry::new(SERVICE, &account)
        .map_err(|_| "Secure credential storage is unavailable.".to_string())?
        .delete_credential()
        .map_err(|_| "Credential could not be removed.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            store_device_credential,
            remove_device_credential
        ])
        .run(tauri::generate_context!())
        .expect("Limitless AI desktop failed to start");
}
