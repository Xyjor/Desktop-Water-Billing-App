use crate::db::BillingRecordInput;

const MAX_NAME_LEN: usize = 200;
const MAX_SHORT_LEN: usize = 50;
const MAX_STATEMENT_LEN: usize = 32;

fn trim_required(value: &str, field: &str, max_len: usize) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{} is required.", field));
    }
    if trimmed.len() > max_len {
        return Err(format!("{} must be at most {} characters.", field, max_len));
    }
    Ok(trimmed.to_string())
}

fn trim_optional(value: &Option<String>, max_len: usize) -> Result<Option<String>, String> {
    match value {
        None => Ok(None),
        Some(v) => {
            let trimmed = v.trim();
            if trimmed.is_empty() {
                Ok(None)
            } else if trimmed.len() > max_len {
                Err(format!("Field must be at most {} characters.", max_len))
            } else {
                Ok(Some(trimmed.to_string()))
            }
        }
    }
}

fn require_finite_non_negative(value: f64, field: &str) -> Result<f64, String> {
    if !value.is_finite() {
        return Err(format!("{} must be a valid number.", field));
    }
    if value < 0.0 {
        return Err(format!("{} cannot be negative.", field));
    }
    Ok(value)
}

pub fn round_money(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

pub fn validate_username(username: &str) -> Result<String, String> {
    let trimmed = username.trim();
    if trimmed.len() < 3 {
        return Err("Username must be at least 3 characters.".to_string());
    }
    if trimmed.len() > 32 {
        return Err("Username must be at most 32 characters.".to_string());
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.')
    {
        return Err(
            "Username may only contain letters, numbers, underscores, and dots.".to_string(),
        );
    }
    Ok(trimmed.to_string())
}

pub fn validate_password(password: &str) -> Result<(), String> {
    let trimmed = password.trim();
    if trimmed.len() < 8 {
        return Err("Password must be at least 8 characters.".to_string());
    }
    if trimmed.len() > 128 {
        return Err("Password must be at most 128 characters.".to_string());
    }
    Ok(())
}

pub fn validate_role(role: &str) -> Result<String, String> {
    match role {
        "ADMIN" | "OPERATOR" => Ok(role.to_string()),
        _ => Err("Invalid role. Allowed values: ADMIN or OPERATOR.".to_string()),
    }
}

pub fn validate_export_path(path: &str) -> Result<std::path::PathBuf, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Export directory path is required.".to_string());
    }
    if trimmed.contains("..") {
        return Err("Invalid path: directory traversal is not allowed.".to_string());
    }

    let path_buf = std::path::PathBuf::from(trimmed);
    if !path_buf.is_absolute() {
        return Err("Please provide a full path (e.g. E:\\ or D:\\backups).".to_string());
    }
    if !path_buf.exists() {
        return Err("The specified directory does not exist.".to_string());
    }
    if !path_buf.is_dir() {
        return Err("The specified path is not a directory.".to_string());
    }

    Ok(path_buf)
}

pub fn validate_billing_record(input: &BillingRecordInput) -> Result<BillingRecordInput, String> {
    let statement_no = trim_required(&input.statement_no, "Billing Statement No.", MAX_STATEMENT_LEN)?;
    let date_issued = trim_required(&input.date_issued, "Date Issued", MAX_SHORT_LEN)?;
    let customer_name = trim_required(&input.customer_name, "Customer Name", MAX_NAME_LEN)?;
    let tapstand_no = trim_required(&input.tapstand_no, "Tapstand No.", MAX_SHORT_LEN)?;
    let tapstand_leader =
        trim_required(&input.tapstand_leader, "Tapstand Leader", MAX_NAME_LEN)?;
    let period_from = trim_required(&input.period_from, "Period From", MAX_SHORT_LEN)?;
    let period_to = trim_required(&input.period_to, "Period To", MAX_SHORT_LEN)?;
    let pay_before = trim_required(&input.pay_before, "Payment Due Date", MAX_SHORT_LEN)?;
    let received_by = trim_optional(&input.received_by, MAX_NAME_LEN)?;

    let water_rate = require_finite_non_negative(input.water_rate, "Water rate")?;
    let present_reading = require_finite_non_negative(input.present_reading, "Present reading")?;
    let previous_reading =
        require_finite_non_negative(input.previous_reading, "Previous reading")?;
    let arrears = require_finite_non_negative(input.arrears, "Arrears")?;
    let surcharge = require_finite_non_negative(input.surcharge, "Surcharge")?;
    let others = require_finite_non_negative(input.others, "Others")?;

    if water_rate > 10_000.0 {
        return Err("Water rate exceeds the allowed maximum.".to_string());
    }
    if present_reading > 9_999_999.0 || previous_reading > 9_999_999.0 {
        return Err("Meter readings exceed the allowed maximum.".to_string());
    }
    if present_reading < previous_reading {
        return Err("Present reading cannot be less than previous reading.".to_string());
    }

    if period_from > period_to {
        return Err("Period From cannot be after Period To.".to_string());
    }

    let total_consumption = round_money(present_reading - previous_reading);
    let current_charge = round_money(total_consumption * water_rate);
    let expected_total = round_money(current_charge + arrears + surcharge + others);

    if !input.total_consumption.is_finite() || !input.total_amount.is_finite() {
        return Err("Billing totals must be valid numbers.".to_string());
    }

    if (round_money(input.total_consumption) - total_consumption).abs() > 0.015 {
        return Err("Consumption total does not match meter readings.".to_string());
    }

    if (round_money(input.total_amount) - expected_total).abs() > 0.015 {
        return Err("Total amount does not match the calculated billing charges.".to_string());
    }

    Ok(BillingRecordInput {
        statement_no,
        date_issued,
        customer_name,
        tapstand_no,
        tapstand_leader,
        water_rate: round_money(water_rate),
        present_reading: round_money(present_reading),
        previous_reading: round_money(previous_reading),
        total_consumption,
        period_from,
        period_to,
        arrears: round_money(arrears),
        surcharge: round_money(surcharge),
        others: round_money(others),
        total_amount: expected_total,
        pay_before,
        received_by,
    })
}
