use serde::Serialize;
use std::sync::Mutex;

#[derive(Clone, Serialize)]
pub struct SessionInfo {
    pub username: String,
    pub role: String,
    pub must_change_password: bool,
}

pub struct AppSession {
    inner: Mutex<Option<SessionInfo>>,
}

impl AppSession {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }

    pub fn set(&self, session: SessionInfo) {
        *self.inner.lock().unwrap() = Some(session);
    }

    pub fn clear(&self) {
        *self.inner.lock().unwrap() = None;
    }

    pub fn get(&self) -> Option<SessionInfo> {
        self.inner.lock().unwrap().clone()
    }

    pub fn require(&self) -> Result<SessionInfo, String> {
        self.get()
            .ok_or_else(|| "Your session has expired. Please sign in again.".to_string())
    }

    pub fn require_admin(&self) -> Result<SessionInfo, String> {
        let session = self.require()?;
        if session.role != "ADMIN" {
            return Err("Administrator access is required for this action.".to_string());
        }
        Ok(session)
    }
}
