import { useRef } from "react";
import { 
  Search, 
  Eye, 
  X, 
  Receipt, 
  AlertCircle, 
  RefreshCw,
  FileText,
  User,
  Droplet,
  Calendar,
  Layers,
  CheckCircle2,
  Download
} from "lucide-react";
import { useBillingRecords } from "../hooks/useBillingRecords";
import ThermalReceipt from "./ThermalReceipt";

export default function BillingRecords() {
  const {
    searchTerm,
    setSearchTerm,
    selectedRecord,
    setSelectedRecord,
    isLoading,
    errorMsg,
    exportSuccessMsg,
    isExporting,
    fetchRecords,
    filteredRecords,
    handleExportPNG,
  } = useBillingRecords();

  const receiptRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm select-none">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search statements by customer, tapstand, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50/50 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
          />
        </div>
        
        <button
          onClick={fetchRecords}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-805 disabled:bg-slate-200 transition-colors cursor-pointer shadow-md shadow-slate-900/10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Database</span>
        </button>
      </div>

      {/* Error block */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-750">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Table container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400 font-semibold select-none">
            <RefreshCw className="h-9 w-9 animate-spin text-emerald-500" />
            <p className="text-sm">Loading archive database...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-24 text-slate-400 font-semibold space-y-2 select-none">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-350 border border-slate-100">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm text-slate-700">No records matching search query</p>
            <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">Create and save statement invoices under the Billing Generator tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-widest border-b border-slate-200 select-none">
                <tr>
                  <th className="px-6 py-4">Statement No</th>
                  <th className="px-6 py-4">Date Issued</th>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Tapstand No</th>
                  <th className="px-6 py-4 text-right">Consumption</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-xs">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      {r.statement_no}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium">{r.date_issued}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 uppercase tracking-wide">
                      {r.customer_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-slate-100 text-slate-650 px-2 py-0.5 rounded border border-slate-200/60 font-bold">
                        {r.tapstand_no}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 font-bold">{r.total_consumption.toFixed(1)} m³</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-extrabold text-emerald-600 text-[13px]">
                        ₱{r.total_amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* High-Fidelity Dual-Pane Modal Preview */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in select-none">
          <div className="bg-slate-50 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative border border-slate-200 max-h-[90vh] flex flex-col transform scale-100 transition-transform">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-3.5 mb-5 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-slate-800">Statement Invoice Details</h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Reprint success alert */}
            {exportSuccessMsg && (
              <div className="mb-4 text-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs p-3 flex items-center justify-center gap-1.5 animate-pulse shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>{exportSuccessMsg}</span>
              </div>
            )}

            {/* Dual-Pane Content Body */}
            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 min-h-0">
              {/* Left Pane - Core Information Grid */}
              <div className="space-y-4">
                {/* Section 1: Customer Card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-500 border-b border-slate-100 pb-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Customer Profile</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Customer Name</span>
                      <span className="font-bold text-slate-800 uppercase block mt-0.5">{selectedRecord.customer_name}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Statement ID</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{selectedRecord.statement_no}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Tapstand Location</span>
                      <span className="font-bold text-slate-800 block mt-0.5">#{selectedRecord.tapstand_no}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Tapstand Leader</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{selectedRecord.tapstand_leader}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Consumption Card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-500 border-b border-slate-100 pb-2">
                    <Droplet className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Meter Metrics</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Previous Reading</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{selectedRecord.previous_reading.toFixed(1)} m³</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Present Reading</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{selectedRecord.present_reading.toFixed(1)} m³</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Water Rate</span>
                      <span className="font-bold text-slate-800 block mt-0.5">₱{selectedRecord.water_rate.toFixed(2)}/m³</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                      <span className="block text-[8px] font-extrabold text-emerald-600 uppercase">Net Consumption</span>
                      <span className="font-extrabold text-emerald-950 block">{selectedRecord.total_consumption.toFixed(1)} m³</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Time Periods */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-slate-500 border-b border-slate-100 pb-2">
                    <Calendar className="h-4 w-4 text-slate-405" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Timeline</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Date Issued</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{selectedRecord.date_issued}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Service From</span>
                      <span className="font-bold text-slate-850 block mt-0.5">{selectedRecord.period_from}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-400 uppercase">Service To</span>
                      <span className="font-bold text-slate-850 block mt-0.5">{selectedRecord.period_to}</span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Acknowledgment details */}
                {selectedRecord.received_by && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-slate-500 border-b border-slate-100 pb-2">
                      <Layers className="h-4 w-4 text-slate-400" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Acknowledgment Sign-off</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Received Representative</span>
                      <span className="font-extrabold text-slate-800 mt-0.5 block">{selectedRecord.received_by}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Pane - Thermal Preview */}
              <div className="flex flex-col items-center justify-start bg-slate-200/50 p-4 rounded-2xl border border-slate-300/40 relative">
                
                {/* Scroll Wrapper to ensure receipt does not spill */}
                <div className="w-full overflow-y-auto max-h-[50vh] pr-1 flex justify-center">
                  <ThermalReceipt ref={receiptRef} record={selectedRecord} />
                </div>

              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="mt-5 border-t border-slate-200 pt-4 flex gap-3 shrink-0 select-none">
              <button
                onClick={() => handleExportPNG(receiptRef.current)}
                disabled={isExporting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-md shadow-emerald-600/10 cursor-pointer disabled:bg-slate-250"
              >
                {isExporting ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-250" />
                ) : (
                  <Download className="h-4 w-4 text-emerald-200" />
                )}
                <span>Save Reprint Copy (PNG)</span>
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-500 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
