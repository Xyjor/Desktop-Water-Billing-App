import Layout from "./components/Layout";
import BillingGenerator from "./components/BillingGenerator";
import BillingRecords from "./components/BillingRecords";
import DashboardStats from "./components/DashboardStats";
import UserManagement from "./components/UserManagement";
import AuditLogs from "./components/AuditLogs";

function App() {
  return (
    <Layout>
      {(activeTab) => {
        switch (activeTab) {
          case "billing-generator":
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Water Billing Generator</h2>
                  <p className="text-slate-500 text-sm font-semibold mt-1">Issue official billing statements and export receipt copies locally</p>
                </div>
                <BillingGenerator />
              </div>
            );
          case "billing-records":
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Billing Records</h2>
                  <p className="text-slate-500 text-sm font-semibold mt-1">Archived history of issued billing statements and invoices</p>
                </div>
                <BillingRecords />
              </div>
            );
          case "dashboard-stats":
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard & Stats</h2>
                  <p className="text-slate-500 text-sm font-semibold mt-1">Statistical summary metrics and collection data overview</p>
                </div>
                <DashboardStats />
              </div>
            );
          case "user-management":
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">User Management</h2>
                  <p className="text-slate-500 text-sm font-semibold mt-1">Manage operator accounts and security access keys</p>
                </div>
                <UserManagement />
              </div>
            );
          case "audit-logs":
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Audit Logs</h2>
                  <p className="text-slate-500 text-sm font-semibold mt-1">Timeline of operator entries and system transitions</p>
                </div>
                <AuditLogs />
              </div>
            );
          default:
            return null;
        }
      }}
    </Layout>
  );
}

export default App;
