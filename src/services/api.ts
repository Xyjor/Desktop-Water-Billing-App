import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// Detect if we are running inside Tauri
export const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// Define basic types for the mock database
interface MockDB {
  users: any[];
  billingRecords: any[];
  customers: any[];
  auditLogs: any[];
  session: any | null;
}

const defaultDB: MockDB = {
  users: [
    {
      id: 1,
      username: "admin",
      role: "admin",
      require_password_change: false,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ],
  billingRecords: [],
  customers: [
    {
      id: 1,
      name: "John Doe",
      address: "123 Main St",
      meter_number: "M-001",
      contact_number: "555-0101",
      status: "active",
      created_at: new Date().toISOString(),
    },
  ],
  auditLogs: [],
  session: null,
};

function getMockDB(): MockDB {
  const data = localStorage.getItem("water_billing_mock_db");
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultDB;
    }
  }
  return defaultDB;
}

function saveMockDB(db: MockDB) {
  localStorage.setItem("water_billing_mock_db", JSON.stringify(db));
}

function addAuditLog(db: MockDB, action: string, details: string) {
  db.auditLogs.unshift({
    id: Date.now(),
    user_id: db.session?.id || 1,
    action,
    details,
    created_at: new Date().toISOString(),
  });
}

const MOCK_DELAY = 400; // Simulate network latency

export async function invoke<T>(
  cmd: string,
  args: Record<string, any> = {}
): Promise<T> {
  if (isTauri) {
    return tauriInvoke<T>(cmd, args);
  }

  // MOCK IMPLEMENTATION
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY));
  const db = getMockDB();

  try {
    switch (cmd) {
      case "get_current_session":
        return { user: db.session } as unknown as T;

      case "login":
        const user = db.users.find(
          (u) =>
            u.username === args.username &&
            (args.password === "admin123" || args.password === u.password || !u.password)
        );
        if (!user) throw new Error("Invalid credentials");
        db.session = user;
        addAuditLog(db, "LOGIN", `User ${user.username} logged in`);
        saveMockDB(db);
        return { user } as unknown as T;

      case "logout":
        db.session = null;
        saveMockDB(db);
        return undefined as unknown as T;

      case "get_billing_records":
        return db.billingRecords as unknown as T;

      case "save_billing_record":
        const newRecord = { ...args.record, id: Date.now(), created_at: new Date().toISOString() };
        db.billingRecords.unshift(newRecord);
        addAuditLog(db, "CREATE_BILL", `Created bill for ${newRecord.customer_name || 'Customer'}`);
        saveMockDB(db);
        return newRecord as unknown as T;

      case "get_dashboard_stats":
        const totalAmount = db.billingRecords.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        const collectedAmount = db.billingRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.total_amount || 0), 0);
        return {
          total_customers: db.customers.length,
          active_customers: db.customers.filter((c) => c.status === "active").length,
          total_revenue: totalAmount,
          collected_revenue: collectedAmount,
          pending_bills: db.billingRecords.filter((r) => r.status === "pending").length,
          recent_records: db.billingRecords.slice(0, 5),
        } as unknown as T;

      case "get_customers":
        return db.customers as unknown as T;

      case "get_next_statement_no":
        return `STMT-${Date.now().toString().slice(-6)}` as unknown as T;

      case "get_users":
        return db.users as unknown as T;

      case "create_user":
        const newUser = {
          id: Date.now(),
          username: args.username,
          role: args.role,
          password: args.password,
          require_password_change: args.require_password_change,
          created_at: new Date().toISOString(),
        };
        db.users.push(newUser);
        addAuditLog(db, "CREATE_USER", `Created user ${args.username}`);
        saveMockDB(db);
        return newUser as unknown as T;

      case "delete_user":
        const userToDelete = db.users.find((u) => u.id === args.id);
        if (userToDelete) {
          db.users = db.users.filter((u) => u.id !== args.id);
          addAuditLog(db, "DELETE_USER", `Deleted user ${userToDelete.username}`);
          saveMockDB(db);
        }
        return undefined as unknown as T;

      case "update_user_password":
        const targetUser = db.users.find((u) => u.id === args.id);
        if (targetUser) {
          targetUser.password = args.new_password;
          targetUser.require_password_change = false;
          addAuditLog(db, "UPDATE_PASSWORD", `Updated password for user ${targetUser.username}`);
          saveMockDB(db);
        }
        return undefined as unknown as T;

      case "get_audit_logs":
        return db.auditLogs as unknown as T;

      case "export_to_usb":
        console.log("Mock export_to_usb called with args:", args);
        addAuditLog(db, "EXPORT_DATA", `Exported data to USB`);
        saveMockDB(db);
        return undefined as unknown as T;

      default:
        console.warn(`Unmocked Tauri command: ${cmd}`);
        throw new Error(`Unmocked Tauri command: ${cmd}`);
    }
  } catch (e: any) {
    throw e.message; // Tauri invoke throws strings
  }
}
