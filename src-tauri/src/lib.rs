mod db;
mod session;
mod validation;

use db::{
    AuditLog, BillingRecord, BillingRecordInput, Customer, DashboardStats, DbManager, User,
};
use session::{AppSession, SessionInfo};
use tauri::State;

fn db_for(app_handle: &tauri::AppHandle) -> Result<DbManager, String> {
    DbManager::new(app_handle)
}

#[tauri::command]
fn login(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
    username: String,
    password: String,
) -> Result<SessionInfo, String> {
    let db_manager = db_for(&app_handle)?;
    let result = db_manager.login_user(&username, &password)?;

    let session_info = SessionInfo {
        username: result.username.clone(),
        role: result.role.clone(),
        must_change_password: result.must_change_password,
    };

    session.set(session_info.clone());

    let conn = db_manager.connect()?;
    db_manager.write_audit_public(
        &conn,
        &format!("User '{}' signed in", result.username),
        &result.role,
    )?;

    Ok(session_info)
}

#[tauri::command]
fn logout(app_handle: tauri::AppHandle, session: State<AppSession>) -> Result<(), String> {
    if let Some(current) = session.get() {
        if let Ok(db_manager) = db_for(&app_handle) {
            if let Ok(conn) = db_manager.connect() {
                let _ = db_manager.write_audit_public(
                    &conn,
                    &format!("User '{}' signed out", current.username),
                    &current.role,
                );
            }
        }
    }

    session.clear();
    Ok(())
}

#[tauri::command]
fn get_session(session: State<AppSession>) -> Result<Option<SessionInfo>, String> {
    Ok(session.get())
}

#[tauri::command]
fn export_to_usb(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
    target_path: String,
) -> Result<String, String> {
    let current = session.require()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.export_database_to(std::path::Path::new(&target_path), &current.role)?;
    Ok("Database exported successfully!".to_string())
}

#[tauri::command]
fn get_next_statement_no(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
) -> Result<String, String> {
    session.require()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.get_next_statement_no()
}

#[tauri::command]
fn save_billing_record(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
    record: BillingRecordInput,
) -> Result<String, String> {
    let current = session.require()?;
    if current.must_change_password {
        return Err("You must change your password before creating billing records.".to_string());
    }

    let db_manager = db_for(&app_handle)?;
    db_manager.save_billing_record(record, current.role.clone())?;
    let _ = db_manager.run_auto_backup();
    Ok("Billing record archived successfully!".to_string())
}

#[tauri::command]
fn get_customers(app_handle: tauri::AppHandle, session: State<AppSession>) -> Result<Vec<Customer>, String> {
    session.require()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.get_customers()
}

#[tauri::command]
fn get_billing_records(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
) -> Result<Vec<BillingRecord>, String> {
    session.require()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.get_billing_records()
}

#[tauri::command]
fn get_dashboard_stats(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
) -> Result<DashboardStats, String> {
    session.require()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.get_dashboard_stats()
}

#[tauri::command]
fn get_users(app_handle: tauri::AppHandle, session: State<AppSession>) -> Result<Vec<User>, String> {
    session.require_admin()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.get_users()
}

#[tauri::command]
fn create_user(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
    username: String,
    password: String,
    role: String,
) -> Result<String, String> {
    let current = session.require_admin()?;
    if role == "ADMIN" && current.role != "ADMIN" {
        return Err("Only administrators can create administrator accounts.".to_string());
    }

    let db_manager = db_for(&app_handle)?;
    db_manager.create_user(username, password, role, &current.role)?;
    Ok("User created successfully!".to_string())
}

#[tauri::command]
fn delete_user(app_handle: tauri::AppHandle, session: State<AppSession>, id: i32) -> Result<String, String> {
    let current = session.require_admin()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.delete_user(id, &current.role)?;
    Ok("User deleted successfully!".to_string())
}

#[tauri::command]
fn update_user_password(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
    username: String,
    password: String,
) -> Result<String, String> {
    let current = session.require()?;
    let target_username = username.trim().to_string();
    let db_manager = db_for(&app_handle)?;
    db_manager.update_user_password(
        username,
        password,
        &current.role,
        &current.username,
    )?;

    if current.username == target_username {
        session.set(SessionInfo {
            username: current.username,
            role: current.role,
            must_change_password: false,
        });
    }

    Ok("Password updated successfully!".to_string())
}

#[tauri::command]
fn get_audit_logs(
    app_handle: tauri::AppHandle,
    session: State<AppSession>,
) -> Result<Vec<AuditLog>, String> {
    session.require_admin()?;
    let db_manager = db_for(&app_handle)?;
    db_manager.get_audit_logs()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppSession::new())
        .setup(|app| {
            let app_handle = app.handle();

            let db_manager = DbManager::new(app_handle)?;
            db_manager.init_db()?;
            db_manager.run_auto_backup()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            logout,
            get_session,
            export_to_usb,
            get_next_statement_no,
            save_billing_record,
            get_customers,
            get_billing_records,
            get_dashboard_stats,
            get_users,
            create_user,
            delete_user,
            update_user_password,
            get_audit_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
