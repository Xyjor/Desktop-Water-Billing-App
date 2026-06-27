import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lock, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function ForcePasswordChange() {
  const { session, clearMustChangePassword } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!session) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await invoke("update_user_password", {
        username: session.username,
        password: newPassword,
      });
      clearMustChangePassword();
      setSuccessMsg("Password updated. You can now use the system.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(String(err).replace(/^Error:\s*/, "") || "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-extrabold text-slate-800">Password Change Required</h2>
        </div>

        <p className="mb-4 text-xs font-semibold leading-relaxed text-slate-500">
          For security, you must set a new password before continuing. This applies to default or
          newly created accounts.
        </p>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                disabled={isSubmitting}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-xs font-extrabold text-white hover:bg-amber-500 disabled:bg-slate-300"
            >
              {isSubmitting && <RefreshCw className="h-3 w-3 animate-spin" />}
              <span>Update Password</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
