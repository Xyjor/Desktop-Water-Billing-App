use crate::validation::{
    validate_billing_record, validate_export_path, validate_password, validate_role,
    validate_username,
};
use chrono::{Duration, Local};
use rusqlite::{params, Connection};
use rusqlite::backup::Backup;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration as StdDuration;
use tauri::Manager;

/// Principle: Separation of Concerns & Defensive Programming
/// The database file operations are fully isolated in this module. Every potential failure
/// (I/O, database syntax, missing paths) is caught and handled, avoiding application crashes.

#[derive(serde::Deserialize)]
pub struct BillingRecordInput {
    pub statement_no: String,
    pub date_issued: String,
    pub customer_name: String,
    pub tapstand_no: String,
    pub tapstand_leader: String,
    pub water_rate: f64,
    pub present_reading: f64,
    pub previous_reading: f64,
    pub total_consumption: f64,
    pub period_from: String,
    pub period_to: String,
    pub arrears: f64,
    pub surcharge: f64,
    pub others: f64,
    pub total_amount: f64,
    pub pay_before: String,
    pub received_by: Option<String>,
}

#[derive(serde::Serialize)]
pub struct Customer {
    pub id: i32,
    pub customer_name: String,
    pub tapstand_no: String,
    pub tapstand_leader: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BillingRecord {
    pub id: i32,
    pub statement_no: String,
    pub date_issued: String,
    pub customer_name: String,
    pub tapstand_no: String,
    pub tapstand_leader: String,
    pub water_rate: f64,
    pub present_reading: f64,
    pub previous_reading: f64,
    pub total_consumption: f64,
    pub period_from: String,
    pub period_to: String,
    pub arrears: f64,
    pub surcharge: f64,
    pub others: f64,
    pub total_amount: f64,
    pub pay_before: String,
    pub received_by: Option<String>,
}

#[derive(serde::Serialize)]
pub struct DashboardStats {
    pub total_statements: i64,
    pub total_consumption: f64,
    pub total_amount: f64,
    pub unique_tapstands: i64,
}

#[derive(serde::Serialize, Clone)]
pub struct User {
    pub id: i32,
    pub username: String,
    pub role: String,
}

#[derive(serde::Serialize, Clone)]
pub struct LoginResult {
    pub username: String,
    pub role: String,
    pub must_change_password: bool,
}

#[derive(serde::Serialize)]
pub struct AuditLog {
    pub id: i32,
    pub timestamp: String,
    pub action_performed: String,
    pub user_role: String,
}

/// Helper function to cryptographically hash a plain-text password using SHA-256 and a static salt.
/// This prevents raw plaintext credential storage in the SQLite DB file.
fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    // Static salt to protect password hashes from simple rainbow tables
    hasher.update(b"nekfawa_salt_123_");
    hasher.update(password.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub struct DbManager {
    db_path: PathBuf,
}

impl DbManager {
    /// Initialize the manager, resolving the app's local data directory in Tauri v2
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        let data_dir = app_handle
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("Could not resolve local AppData directory: {}", e))?;

        // Ensure the data directory exists
        if !data_dir.exists() {
            fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create AppData directory: {}", e))?;
        }

        let db_path = data_dir.join("nekfawa.db");
        Ok(DbManager { db_path })
    }

    /// DRY Principle: Establishes a database connection and sets high-performance WAL and synchronous pragmas.
    /// This keeps all SQLite connections optimized and safe in one centralized routine.
    pub fn connect(&self) -> Result<Connection, String> {
        let conn = Connection::open(&self.db_path).map_err(|e| format!("Database connection failed: {}", e))?;
        
        // Enable foreign key constraints
        conn.pragma_update(None, "foreign_keys", &"ON").map_err(|e| e.to_string())?;

        // Enable Write-Ahead Logging (WAL) for faster commits and better concurrent read/write scaling
        conn.pragma_update(None, "journal_mode", &"WAL").map_err(|e| e.to_string())?;
        conn.pragma_update(None, "synchronous", &"NORMAL").map_err(|e| e.to_string())?;

        Ok(conn)
    }

    /// Open database connection and run setup migrations
    pub fn init_db(&self) -> Result<(), String> {
        let conn = self.connect()?;

        // Create tables if they do not exist (Idempotent migrations)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL
            );",
            [],
        ).map_err(|e| format!("Failed to create users table: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT UNIQUE NOT NULL,
                tapstand_no TEXT NOT NULL,
                tapstand_leader TEXT NOT NULL
            );",
            [],
        ).map_err(|e| format!("Failed to create customers table: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS billing_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                statement_no TEXT UNIQUE NOT NULL,
                date_issued TEXT NOT NULL,
                customer_id INTEGER NOT NULL,
                water_rate REAL NOT NULL,
                present_reading REAL NOT NULL,
                previous_reading REAL NOT NULL,
                total_consumption REAL NOT NULL,
                period_from TEXT NOT NULL,
                period_to TEXT NOT NULL,
                arrears REAL NOT NULL,
                surcharge REAL NOT NULL,
                others REAL NOT NULL,
                total_amount REAL NOT NULL,
                pay_before TEXT NOT NULL,
                received_by TEXT,
                FOREIGN KEY(customer_id) REFERENCES customers(id)
            );",
            [],
        ).map_err(|e| format!("Failed to create billing_records table: {}", e))?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                action_performed TEXT NOT NULL,
                user_role TEXT NOT NULL
            );",
            [],
        ).map_err(|e| format!("Failed to create audit_logs table: {}", e))?;

        // Migration: must_change_password flag for first-login enforcement
        let _ = conn.execute(
            "ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0",
            [],
        );

        // Insert default admin user with a HASHED password if not present (Security Upgrade)
        let mut stmt = conn.prepare("SELECT COUNT(*) FROM users").map_err(|e| e.to_string())?;
        let user_count: i64 = stmt.query_row([], |row| row.get(0)).map_err(|e| e.to_string())?;
        if user_count == 0 {
            let default_hash = hash_password("admin123");
            conn.execute(
                "INSERT INTO users (username, password_hash, role, must_change_password) VALUES ('admin', ?1, 'ADMIN', 1);",
                params![default_hash],
            ).map_err(|e| format!("Failed to seed default admin: {}", e))?;
        }

        Ok(())
    }

    fn write_audit_log(&self, conn: &Connection, action: &str, user_role: &str) -> Result<(), String> {
        let timestamp = Local::now().to_rfc3339();
        conn.execute(
            "INSERT INTO audit_logs (timestamp, action_performed, user_role) VALUES (?1, ?2, ?3)",
            params![timestamp, action, user_role],
        )
        .map_err(|e| format!("Failed to record audit log: {}", e))?;
        Ok(())
    }

    pub fn write_audit_public(
        &self,
        conn: &Connection,
        action: &str,
        user_role: &str,
    ) -> Result<(), String> {
        self.write_audit_log(conn, action, user_role)
    }

    fn backup_to_path(&self, destination: &Path) -> Result<(), String> {
        let src_conn = self.connect()?;
        let mut dest_conn =
            Connection::open(destination).map_err(|e| format!("Backup destination failed: {}", e))?;

        let backup = Backup::new(&src_conn, &mut dest_conn)
            .map_err(|e| format!("Database backup initialization failed: {}", e))?;
        backup
            .run_to_completion(100, StdDuration::from_millis(50), None)
            .map_err(|e| format!("Database backup failed: {}", e))?;
        Ok(())
    }

    fn prune_old_backups(&self, backup_dir: &Path, keep_days: i64) -> Result<(), String> {
        if !backup_dir.exists() {
            return Ok(());
        }

        let cutoff = Local::now() - Duration::days(keep_days);
        for entry in fs::read_dir(backup_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let file_name = path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("");
            if !file_name.starts_with("nekfawa_backup_") || !file_name.ends_with(".db") {
                continue;
            }

            let modified = entry
                .metadata()
                .and_then(|meta| meta.modified())
                .ok();
            if let Some(modified) = modified {
                let modified: chrono::DateTime<Local> = modified.into();
                if modified < cutoff {
                    let _ = fs::remove_file(path);
                }
            }
        }

        Ok(())
    }

    pub fn login_user(&self, username: &str, password: &str) -> Result<LoginResult, String> {
        let username = username.trim();
        if username.is_empty() || password.trim().is_empty() {
            return Err("Username and password are required.".to_string());
        }

        let conn = self.connect()?;
        let query = conn.query_row(
            "SELECT password_hash, role, must_change_password FROM users WHERE username = ?1",
            [&username],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, i64>(2)?,
                ))
            },
        );

        match query {
            Ok((stored_hash, role, must_change_password)) => {
                let provided_hash = hash_password(password);
                if provided_hash != stored_hash {
                    return Err("Invalid username or password.".to_string());
                }

                Ok(LoginResult {
                    username: username.to_string(),
                    role,
                    must_change_password: must_change_password != 0,
                })
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                Err("Invalid username or password.".to_string())
            }
            Err(e) => Err(format!("Login failed: {}", e)),
        }
    }

    /// Automatically run daily rolling backup on startup
    pub fn run_auto_backup(&self) -> Result<(), String> {
        if !self.db_path.exists() {
            return Ok(()); // Nothing to backup yet
        }

        let parent_dir = self.db_path.parent()
            .ok_or_else(|| "Failed to resolve database parent path".to_string())?;

        let backup_dir = parent_dir.join("backups");
        if !backup_dir.exists() {
            fs::create_dir_all(&backup_dir).map_err(|e| format!("Failed to create backups folder: {}", e))?;
        }

        let date_str = Local::now().format("%Y-%m-%d").to_string();
        let backup_file_name = format!("nekfawa_backup_{}.db", date_str);
        let backup_path = backup_dir.join(backup_file_name);

        // Backup Idempotency: skip if already backed up today
        if !backup_path.exists() {
            self.backup_to_path(&backup_path)?;
        }

        let _ = self.prune_old_backups(&backup_dir, 90);

        Ok(())
    }

    /// Save a billing statement record, linking/creating a customer, and adding to audit log in one transaction
    pub fn save_billing_record(&self, input: BillingRecordInput, operator_role: String) -> Result<(), String> {
        let input = validate_billing_record(&input)?;
        let mut conn = self.connect()?;
        let tx = conn.transaction().map_err(|e| format!("Transaction creation failed: {}", e))?;

        // 1. Get or create customer by name
        let customer_id: i64 = {
            let mut stmt = tx.prepare(
                "SELECT id FROM customers WHERE customer_name = ?1"
            ).map_err(|e| e.to_string())?;
            
            let query_res = stmt.query_row([&input.customer_name], |row| row.get(0));
            
            match query_res {
                Ok(id) => {
                    tx.execute(
                        "UPDATE customers SET tapstand_no = ?1, tapstand_leader = ?2 WHERE id = ?3",
                        params![input.tapstand_no, input.tapstand_leader, id]
                    ).map_err(|e| e.to_string())?;
                    id
                },
                Err(rusqlite::Error::QueryReturnedNoRows) => {
                    tx.execute(
                        "INSERT INTO customers (customer_name, tapstand_no, tapstand_leader) VALUES (?1, ?2, ?3)",
                        params![input.customer_name, input.tapstand_no, input.tapstand_leader]
                    ).map_err(|e| e.to_string())?;
                    tx.last_insert_rowid()
                },
                Err(e) => return Err(format!("Customer lookup query failed: {}", e))
            }
        };

        // 2. Insert billing record
        if let Err(e) = tx.execute(
            "INSERT INTO billing_records (
                statement_no, date_issued, customer_id, water_rate, present_reading, 
                previous_reading, total_consumption, period_from, period_to, arrears, 
                surcharge, others, total_amount, pay_before, received_by
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                input.statement_no,
                input.date_issued,
                customer_id,
                input.water_rate,
                input.present_reading,
                input.previous_reading,
                input.total_consumption,
                input.period_from,
                input.period_to,
                input.arrears,
                input.surcharge,
                input.others,
                input.total_amount,
                input.pay_before,
                input.received_by
            ]
        ) {
            let message = e.to_string();
            if message.contains("UNIQUE constraint failed") && message.contains("statement_no") {
                return Err(format!(
                    "Statement number '{}' already exists. Please use a different number.",
                    input.statement_no
                ));
            }
            return Err(format!("Failed to insert billing statement: {}", message));
        }

        // 3. Write to Audit Logs (Dynamic role support added)
        let log_msg = format!("Created billing statement #{} for {}", input.statement_no, input.customer_name);
        self.write_audit_log(&*tx, &log_msg, &operator_role)?;

        tx.commit().map_err(|e| format!("Transaction commit failed: {}", e))?;
        Ok(())
    }

    /// Retrieve unique list of customers for autofill assistance
    pub fn get_customers(&self) -> Result<Vec<Customer>, String> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare("SELECT id, customer_name, tapstand_no, tapstand_leader FROM customers").map_err(|e| e.to_string())?;
        
        let customer_iter = stmt.query_map([], |row| {
            Ok(Customer {
                id: row.get(0)?,
                customer_name: row.get(1)?,
                tapstand_no: row.get(2)?,
                tapstand_leader: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut customers = Vec::new();
        for customer in customer_iter {
            customers.push(customer.map_err(|e| e.to_string())?);
        }
        Ok(customers)
    }

    /// Retrieve list of all billing records ordered by date issued desc
    pub fn get_billing_records(&self) -> Result<Vec<BillingRecord>, String> {
        let conn = self.connect()?;
        
        let mut stmt = conn.prepare(
            "SELECT 
                r.id, r.statement_no, r.date_issued, c.customer_name, c.tapstand_no, c.tapstand_leader,
                r.water_rate, r.present_reading, r.previous_reading, r.total_consumption,
                r.period_from, r.period_to, r.arrears, r.surcharge, r.others, r.total_amount,
                r.pay_before, r.received_by
             FROM billing_records r
             JOIN customers c ON r.customer_id = c.id
             ORDER BY r.date_issued DESC"
        ).map_err(|e| e.to_string())?;

        let record_iter = stmt.query_map([], |row| {
            Ok(BillingRecord {
                id: row.get(0)?,
                statement_no: row.get(1)?,
                date_issued: row.get(2)?,
                customer_name: row.get(3)?,
                tapstand_no: row.get(4)?,
                tapstand_leader: row.get(5)?,
                water_rate: row.get(6)?,
                present_reading: row.get(7)?,
                previous_reading: row.get(8)?,
                total_consumption: row.get(9)?,
                period_from: row.get(10)?,
                period_to: row.get(11)?,
                arrears: row.get(12)?,
                surcharge: row.get(13)?,
                others: row.get(14)?,
                total_amount: row.get(15)?,
                pay_before: row.get(16)?,
                received_by: row.get(17)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut records = Vec::new();
        for record in record_iter {
            records.push(record.map_err(|e| e.to_string())?);
        }
        Ok(records)
    }

    /// Retrieve aggregated database metrics
    pub fn get_dashboard_stats(&self) -> Result<DashboardStats, String> {
        let conn = self.connect()?;

        let total_statements: i64 = conn
            .query_row("SELECT COUNT(*) FROM billing_records", [], |row| row.get(0))
            .unwrap_or(0);

        let total_consumption: f64 = conn
            .query_row("SELECT COALESCE(SUM(total_consumption), 0.0) FROM billing_records", [], |row| row.get(0))
            .unwrap_or(0.0);

        let total_amount: f64 = conn
            .query_row("SELECT COALESCE(SUM(total_amount), 0.0) FROM billing_records", [], |row| row.get(0))
            .unwrap_or(0.0);

        let unique_tapstands: i64 = conn
            .query_row("SELECT COUNT(DISTINCT tapstand_no) FROM customers", [], |row| row.get(0))
            .unwrap_or(0);

        Ok(DashboardStats {
            total_statements,
            total_consumption,
            total_amount,
            unique_tapstands,
        })
    }

    /// Retrieve list of all users
    pub fn get_users(&self) -> Result<Vec<User>, String> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare("SELECT id, username, role FROM users").map_err(|e| e.to_string())?;
        
        let user_iter = stmt.query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                role: row.get(2)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut users = Vec::new();
        for user in user_iter {
            users.push(user.map_err(|e| e.to_string())?);
        }
        Ok(users)
    }

    /// Add a new user operator (Security validation + Cryptographic Hashing)
    pub fn create_user(
        &self,
        username: String,
        password_raw: String,
        role: String,
        actor_role: &str,
    ) -> Result<(), String> {
        let username = validate_username(&username)?;
        validate_password(&password_raw)?;
        let role = validate_role(&role)?;

        let conn = self.connect()?;
        
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM users WHERE username = ?1",
            [&username],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        
        if count > 0 {
            return Err("Username already exists".to_string());
        }

        let password_hash = hash_password(&password_raw);
        conn.execute(
            "INSERT INTO users (username, password_hash, role, must_change_password) VALUES (?1, ?2, ?3, 1)",
            params![username, password_hash, role]
        ).map_err(|e| format!("Failed to create user: {}", e))?;

        let log_msg = format!("Created operator account '{}'", username);
        self.write_audit_log(&conn, &log_msg, actor_role)?;

        Ok(())
    }

    /// Remove a user operator (Defensive deletion lock)
    pub fn delete_user(&self, id: i32, actor_role: &str) -> Result<(), String> {
        let conn = self.connect()?;
        
        let username: String = conn.query_row(
            "SELECT username FROM users WHERE id = ?1",
            [id],
            |row| row.get(0)
        ).map_err(|_| "User not found".to_string())?;

        if username == "admin" {
            return Err("Cannot delete primary administrator account".to_string());
        }

        let admin_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM users WHERE role = 'ADMIN'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let target_role: String = conn
            .query_row(
                "SELECT role FROM users WHERE id = ?1",
                [id],
                |row| row.get(0),
            )
            .map_err(|_| "User not found".to_string())?;

        if target_role == "ADMIN" && admin_count <= 1 {
            return Err("Cannot delete the last administrator account.".to_string());
        }

        conn.execute("DELETE FROM users WHERE id = ?1", [id]).map_err(|e| e.to_string())?;

        let log_msg = format!("Deleted operator account '{}'", username);
        self.write_audit_log(&conn, &log_msg, actor_role)?;

        Ok(())
    }

    /// Update user password (Cryptographic Hashing upgrade)
    pub fn update_user_password(
        &self,
        username: String,
        password_raw: String,
        actor_role: &str,
        actor_username: &str,
    ) -> Result<(), String> {
        validate_password(&password_raw)?;
        let username = username.trim().to_string();
        if username.is_empty() {
            return Err("Username is required.".to_string());
        }

        if actor_role != "ADMIN" && actor_username != username {
            return Err("You may only change your own password.".to_string());
        }

        let conn = self.connect()?;
        
        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM users WHERE username = ?1",
            [&username],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        if count == 0 {
            return Err("User not found".to_string());
        }

        let password_hash = hash_password(&password_raw);
        conn.execute(
            "UPDATE users SET password_hash = ?1, must_change_password = 0 WHERE username = ?2",
            params![password_hash, username]
        ).map_err(|e| e.to_string())?;

        let log_msg = format!("Updated password for user '{}'", username);
        self.write_audit_log(&conn, &log_msg, actor_role)?;

        Ok(())
    }

    /// Retrieve all audit logs sorted chronologically desc
    pub fn get_audit_logs(&self) -> Result<Vec<AuditLog>, String> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare("SELECT id, timestamp, action_performed, user_role FROM audit_logs ORDER BY timestamp DESC").map_err(|e| e.to_string())?;
        
        let log_iter = stmt.query_map([], |row| {
            Ok(AuditLog {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                action_performed: row.get(2)?,
                user_role: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut logs = Vec::new();
        for log in log_iter {
            logs.push(log.map_err(|e| e.to_string())?);
        }
        Ok(logs)
    }

    /// Export the database to a directory (e.g. external USB drive)
    pub fn export_database_to<P: AsRef<Path>>(&self, target_dir: P, actor_role: &str) -> Result<(), String> {
        if !self.db_path.exists() {
            return Err("Active database file not found. Create a statement first.".to_string());
        }

        let target_dir = validate_export_path(target_dir.as_ref().to_string_lossy().as_ref())?;
        let target_path = target_dir.join(format!(
            "nekfawa_export_{}.db",
            Local::now().format("%Y-%m-%d_%H%M%S")
        ));

        self.backup_to_path(&target_path)?;

        let conn = self.connect()?;
        self.write_audit_log(
            &conn,
            &format!("Exported database backup to {}", target_path.display()),
            actor_role,
        )?;

        Ok(())
    }

    /// Retrieve the next available billing statement number for the current year
    pub fn get_next_statement_no(&self) -> Result<String, String> {
        let conn = self.connect()?;
        let current_year = Local::now().format("%Y").to_string();
        let pattern = format!("{}-%", current_year);

        let mut stmt = conn.prepare(
            "SELECT statement_no FROM billing_records 
             WHERE statement_no LIKE ?1 
             ORDER BY statement_no DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;

        let query_res = stmt.query_row([pattern], |row| {
            let val: String = row.get(0)?;
            Ok(val)
        });

        match query_res {
            Ok(no) => {
                let parts: Vec<&str> = no.split('-').collect();
                if parts.len() == 2 {
                    if let Ok(seq) = parts[1].parse::<u32>() {
                        return Ok(format!("{}-{:04}", current_year, seq + 1));
                    }
                }
                Ok(format!("{}-0001", current_year))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                Ok(format!("{}-0001", current_year))
            }
            Err(e) => Err(format!("Failed to retrieve latest statement number: {}", e))
        }
    }
}
