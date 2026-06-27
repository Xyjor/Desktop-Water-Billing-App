import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  ClipboardList, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  Clock,
  User,
  KeyRound,
  FileSpreadsheet,
  Trash2,
  Database,
  Zap
} from "lucide-react";

interface AuditLog {
  id: number;
  timestamp: string;
  action_performed: string;
  user_role: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data: AuditLog[] = await invoke("get_audit_logs");
      setLogs(data);
    } catch (e) {
      setErrorMsg(typeof e === "string" ? e : "Failed to load audit trail.");
    } finally {
      setIsLoading(false);
    }
  }

  // Live filter logs
  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      log.action_performed.toLowerCase().includes(term) ||
      log.user_role.toLowerCase().includes(term)
    );
  });

  // Safe timestamp formatting (Defensive programming: fallback defaults)
  const formatTimestamp = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      if (isNaN(date.getTime())) return isoStr;
      
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  // Helper to determine icon, color, and category based on the action text (Defensive UX routing)
  const getActionMetadata = (action: string) => {
    const text = action.toLowerCase();
    if (text.includes("password")) {
      return {
        icon: KeyRound,
        bgClass: "bg-amber-50 border-amber-100 text-amber-600",
        pillClass: "bg-amber-100 text-amber-800"
      };
    }
    if (text.includes("delete") || text.includes("remove")) {
      return {
        icon: Trash2,
        bgClass: "bg-red-50 border-red-105 text-red-600",
        pillClass: "bg-red-100 text-red-800"
      };
    }
    if (text.includes("create_user") || text.includes("operator account")) {
      return {
        icon: User,
        bgClass: "bg-blue-50 border-blue-100 text-blue-600",
        pillClass: "bg-blue-100 text-blue-800"
      };
    }
    if (text.includes("billing") || text.includes("statement") || text.includes("save_billing_record")) {
      return {
        icon: FileSpreadsheet,
        bgClass: "bg-emerald-50 border-emerald-100 text-emerald-600",
        pillClass: "bg-emerald-100 text-emerald-800"
      };
    }
    if (text.includes("export") || text.includes("usb") || text.includes("backup")) {
      return {
        icon: Database,
        bgClass: "bg-indigo-50 border-indigo-100 text-indigo-600",
        pillClass: "bg-indigo-100 text-indigo-800"
      };
    }
    return {
      icon: Zap,
      bgClass: "bg-slate-50 border-slate-200 text-slate-500",
      pillClass: "bg-slate-100 text-slate-700"
    };
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
          />
        </div>
        
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-805 disabled:bg-slate-200 transition-colors cursor-pointer shadow-md shadow-slate-900/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Sync Trail</span>
        </button>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-750">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Timeline container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 overflow-hidden relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 font-semibold">
            <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
            <p className="text-sm">Loading security timeline...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-semibold space-y-2">
            <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-350">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-700">No log trail entries found</p>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">System operations and user management triggers are recorded automatically in local SQLite.</p>
          </div>
        ) : (
          <div className="relative">
            {/* The vertical timeline bar track */}
            <div className="absolute left-[21px] top-4 bottom-4 w-[2px] bg-slate-100 border-l border-slate-200/60 pointer-events-none z-0"></div>

            <div className="space-y-6 relative z-10">
              {filteredLogs.map((log) => {
                const meta = getActionMetadata(log.action_performed);
                const Icon = meta.icon;
                const isAdmin = log.user_role === "ADMIN";

                return (
                  <div key={log.id} className="flex gap-4 group items-start select-none">
                    
                    {/* timeline icon node circle */}
                    <div className={`h-11 w-11 rounded-2xl border flex items-center justify-center shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-105 z-10 ${meta.bgClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Timeline card data body */}
                    <div className="flex-1 bg-slate-50/40 border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/90 hover:border-slate-300/60 transition-all duration-200">
                      
                      {/* Left: action message */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-805 leading-relaxed block">
                          {log.action_performed}
                        </span>
                        
                        {/* mobile responsive date detail */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold font-mono">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                      </div>

                      {/* Right: Badge labels */}
                      <div className="flex items-center gap-2 shrink-0 self-start md:self-center select-none">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-widest ${
                          isAdmin 
                            ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm" 
                            : "bg-slate-100 text-slate-650 border border-slate-200"
                        }`}>
                          {log.user_role}
                        </span>
                        
                        <span className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-extrabold border border-slate-250/20">
                          #{log.id}
                        </span>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
