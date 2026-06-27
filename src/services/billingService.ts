import { invoke } from "./api";

export interface BillingRecord {
  id: number;
  statement_no: string;
  date_issued: string;
  customer_name: string;
  tapstand_no: string;
  tapstand_leader: string;
  water_rate: number;
  present_reading: number;
  previous_reading: number;
  total_consumption: number;
  period_from: string;
  period_to: string;
  arrears: number;
  surcharge: number;
  others: number;
  total_amount: number;
  pay_before: string;
  received_by: string | null;
}

/**
 * Fetches all billing records from the database.
 * Enforces explicit error logging for database communication failures.
 */
export async function getBillingRecords(): Promise<BillingRecord[]> {
  try {
    const records = await invoke<BillingRecord[]>("get_billing_records");
    return records;
  } catch (error) {
    // Explicit logging of external database fetching failures
    console.error("[BillingService] Failed to retrieve billing records from Tauri backend:", error);
    throw error;
  }
}

export interface DashboardStats {
  total_statements: number;
  total_consumption: number;
  total_amount: number;
  unique_tapstands: number;
}

/**
 * Fetches aggregated statistics from the SQLite database.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const stats = await invoke<DashboardStats>("get_dashboard_stats");
    return stats;
  } catch (error) {
    console.error("[BillingService] Failed to retrieve dashboard statistics from Tauri backend:", error);
    throw error;
  }
}
