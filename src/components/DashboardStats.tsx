import { useState, useMemo } from "react";
import { invoke } from "../services/api";
import { 
  Receipt, 
  Droplet, 
  Coins, 
  Network, 
  Database, 
  ArrowUpRight, 
  FileText,
  AlertCircle, 
  RefreshCw,
  CheckCircle2,
  HardDrive
} from "lucide-react";
import { useBillingContext } from "../context/BillingContext";

export default function DashboardStats() {
  const { records, stats, isLoading, errorMsg, refreshAll } = useBillingContext();
  
  // USB Export States
  const [usbPath, setUsbPath] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Derives the top 5 most recent statements from the shared Context cache
  const recentRecords = useMemo(() => records.slice(0, 5), [records]);

  // Fallbacks for initial stats state loading
  const displayStats = stats || {
    total_statements: 0,
    total_consumption: 0.0,
    total_amount: 0.0,
    unique_tapstands: 0,
  };

  // Trigger Rust backend directory clone command (USB Export)
  const handleUsbExport = async () => {
    setExportStatus("");
    setExportProgress(0);

    if (!usbPath.trim()) {
      return setExportStatus("Please specify a directory path (e.g. E:\\ or D:\\backups).");
    }

    setIsExporting(true);

    // Dynamic Simulated Progress Bar for premium UX feedback
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 100);

    try {
      await invoke("export_to_usb", { targetPath: usbPath });
      setExportProgress(100);
      setExportStatus("Success: Database file exported to USB directory!");
    } catch (e) {
      clearInterval(interval);
      setExportProgress(0);
      setExportStatus(`Export failed: ${e}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Top action row */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">System Operations Panel</h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Statistical metrics loaded directly from SQLite transaction audits</p>
        </div>
        <button
          onClick={refreshAll}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-850 disabled:bg-slate-200 transition-colors cursor-pointer shadow-md shadow-slate-900/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Sync Summary</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-750">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modern High-Fidelity Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Statements Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.02] transition-all duration-200 group">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Statements</span>
            <h4 className="text-3xl font-black text-slate-800 tracking-tight mt-1">
              {displayStats.total_statements}
            </h4>
            <p className="text-[10px] font-semibold text-slate-450 mt-1.5">Total bills generated</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 group-hover:scale-110 transition-transform duration-200 shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        {/* Total Consumption Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.02] transition-all duration-200 group">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Consumption</span>
            <h4 className="text-3xl font-black text-slate-800 tracking-tight mt-1">
              {displayStats.total_consumption.toFixed(1)} <span className="text-xs font-bold text-slate-455">m³</span>
            </h4>
            <p className="text-[10px] font-semibold text-slate-455 mt-1.5">Aggregate water volume</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform duration-200 shrink-0">
            <Droplet className="h-5 w-5" />
          </div>
        </div>

        {/* Total Amount Billed Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.02] transition-all duration-200 group">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Receivables</span>
            <h4 className="text-3xl font-black text-emerald-600 tracking-tight mt-1">
              ₱{displayStats.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h4>
            <p className="text-[10px] font-semibold text-emerald-700/80 mt-1.5">Aggregate revenue amount</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-650 group-hover:scale-110 transition-transform duration-200 shrink-0">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        {/* Active Tapstands Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.02] transition-all duration-200 group">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Locations</span>
            <h4 className="text-3xl font-black text-slate-800 tracking-tight mt-1">
              {displayStats.unique_tapstands}
            </h4>
            <p className="text-[10px] font-semibold text-slate-450 mt-1.5">Registered tapstands</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform duration-200 shrink-0">
            <Network className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Inner Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols - Recent Statements activity feed */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/20">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recent Activity Feed</h3>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Chronology of the last 5 statement entries</p>
            </div>
            <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 uppercase tracking-wide">Live Updates</span>
          </div>
          
          <div className="flex-1 divide-y divide-slate-100">
            {recentRecords.length === 0 ? (
              <div className="text-center py-20 text-slate-400 font-semibold text-xs flex flex-col items-center justify-center gap-2">
                <FileText className="h-8 w-8 text-slate-300" />
                <span>No water statements recorded in SQLite yet</span>
              </div>
            ) : (
              recentRecords.map((r) => (
                <div key={r.id} className="p-4 flex justify-between items-center hover:bg-slate-50/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-250/30 flex items-center justify-center text-slate-400">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{r.customer_name}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Statement <span className="font-bold text-slate-600">#{r.statement_no}</span> • Tapstand {r.tapstand_no}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-emerald-600">₱{r.total_amount.toFixed(2)}</span>
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{r.date_issued}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col - USB Database Backup Export Control Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-650 shrink-0">
                <Database className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Database Backup Utility</h3>
                <p className="text-[10px] text-slate-400 font-semibold">Local synchronization archives</p>
              </div>
            </div>
            <p className="text-xs text-slate-450 font-semibold leading-relaxed">
              Export the active database file (<code className="bg-slate-100 text-slate-655 px-1 py-0.5 rounded font-bold">nekfawa.db</code>) directly to a target external storage directory (e.g. flash drive backup).
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">USB Target Path</label>
                <div className="relative">
                  <HardDrive className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. D:\Backups or E:\"
                    value={usbPath}
                    onChange={(e) => setUsbPath(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-2 text-xs font-bold focus:border-blue-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>

              {/* simulated premium progress bar */}
              {isExporting && (
                <div className="space-y-1.5 select-none pt-1">
                  <div className="flex justify-between text-[9px] font-extrabold text-blue-600 uppercase">
                    <span>Exporting database...</span>
                    <span>{exportProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-150" 
                      style={{ width: `${exportProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {exportStatus && !isExporting && (
                <div className={`text-[10px] font-bold p-3 rounded-xl flex items-start gap-1.5 ${
                  exportStatus.startsWith("Success") 
                    ? "bg-emerald-50 border border-emerald-250 text-emerald-800" 
                    : "bg-red-50 border border-red-250 text-red-800"
                }`}>
                  {exportStatus.startsWith("Success") ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-650 mt-0.5" />
                  )}
                  <span>{exportStatus}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleUsbExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/10 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
          >
            {isExporting ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-200" />
            ) : (
              <ArrowUpRight className="h-4.5 w-4.5 text-blue-200" />
            )}
            <span>Trigger Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
}
