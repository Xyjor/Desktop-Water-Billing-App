import { useState } from "react";
import { Droplet, Lock, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setErrorMsg(String(err).replace(/^Error:\s*/, "") || "Sign in failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Droplet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white">NEKFAWA</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Water Billing System
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:bg-slate-700"
          >
            {isSubmitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-500">
          First-time setup uses the default administrator account. You will be required to change
          the password immediately after signing in.
        </p>
      </div>
    </div>
  );
}
