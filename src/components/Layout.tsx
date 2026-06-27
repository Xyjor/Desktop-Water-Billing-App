import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Receipt, 
  History, 
  LayoutDashboard, 
  Users, 
  ShieldAlert, 
  KeyRound,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type TabId = "billing-generator" | "billing-records" | "dashboard-stats" | "user-management" | "audit-logs";

interface LayoutProps {
  children: (activeTab: TabId) => React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { session, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("billing-generator");
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Change Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const isAdmin = session?.role === "ADMIN";

  const menuItems = [
    { id: "billing-generator" as TabId, label: "Billing Generator", icon: Receipt, adminOnly: false },
    { id: "billing-records" as TabId, label: "Billing Records", icon: History, adminOnly: false },
    { id: "dashboard-stats" as TabId, label: "Dashboard & Stats", icon: LayoutDashboard, adminOnly: false },
    { id: "user-management" as TabId, label: "User Management", icon: Users, adminOnly: true },
    { id: "audit-logs" as TabId, label: "Audit Logs", icon: ShieldAlert, adminOnly: true },
  ].filter((item) => !item.adminOnly || isAdmin);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Input Validation (Defensive Programming)
    if (!newPassword.trim()) {
      setErrorMsg("New password cannot be empty.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke("update_user_password", {
        username: session?.username ?? "admin",
        password: newPassword,
      });
      setSuccessMsg("Administrator password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setSuccessMsg("");
      }, 1800);
    } catch (err) {
      setErrorMsg(String(err) || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-800 selection:bg-emerald-500 selection:text-white">
      {/* Sidebar - Collapsible with beautiful transitions */}
      <aside 
        className={`flex flex-col justify-between bg-slate-900 text-white shadow-2xl select-none transition-all duration-300 ease-in-out border-r border-slate-800 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-6">
          {/* Logo / Header & Collapse Toggle */}
          <div className="flex items-center justify-between mb-8 px-2">
            {!isCollapsed && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  NEKFAWA
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Water Billing</p>
              </div>
            )}
            {isCollapsed && (
              <div className="mx-auto text-center font-black text-emerald-400 text-xl tracking-tight">
                N
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer shadow-inner border border-slate-700"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer group relative ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-emerald-400"
                  }`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                  {isCollapsed && (
                    <span className="absolute left-full ml-4 hidden group-hover:block z-50 bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 space-y-4 border-t border-slate-800 bg-slate-950/40">
          {/* Change Password Action */}
          <button 
            onClick={() => {
              setErrorMsg("");
              setSuccessMsg("");
              setShowPasswordModal(true);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl bg-slate-800/60 px-4 py-2.5 text-xs font-bold text-slate-350 hover:bg-slate-800 hover:text-white transition-all duration-200 cursor-pointer shadow-inner border border-slate-800 w-full ${
              isCollapsed ? "px-2" : ""
            }`}
            title="Change Password"
          >
            <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
            {!isCollapsed && <span>Change Password</span>}
          </button>

          {/* Developer Attribution */}
          {!isCollapsed && (
            <div className="px-2 text-[10px] text-slate-500 leading-tight">
              <span className="block text-slate-650 font-medium">Developed by</span>
              <span className="block font-semibold text-slate-400">Computer Engineering Student</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header/Status bar */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Current View:</span>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-3 py-1 rounded-full capitalize">
              {activeTab.replace("-", " ")}
            </span>
          </div>
          <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 border border-blue-100 shadow-sm shadow-blue-100/20">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span>Current user:</span>
            <span className="font-extrabold text-blue-900">
              {session?.username} ({session?.role})
            </span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
          </div>
        </header>

        {/* Content area injected child view */}
        <section className="flex-1 p-8">
          <div className="mx-auto max-w-7xl">
            {children(activeTab)}
          </div>
        </section>
      </main>

      {/* Change Password Dialog Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 transform scale-100 transition-transform">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-800">Change Admin Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-450 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-xs font-semibold text-red-750">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 mb-4 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-xs font-extrabold cursor-pointer"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500 transition-colors cursor-pointer shadow-md shadow-emerald-600/10"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
