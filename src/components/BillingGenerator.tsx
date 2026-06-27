import { useState, useEffect, useRef } from "react";
import { invoke } from "../services/api";
import { 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  User,
  Droplet,
  PlusCircle,
  Sparkles
} from "lucide-react";

interface Customer {
  id: number;
  customer_name: String;
  tapstand_no: string;
  tapstand_leader: string;
}

type FormTab = "customer" | "consumption" | "charges";

export default function BillingGenerator() {
  // Form Tabs State
  const [activeTab, setActiveTab] = useState<FormTab>("customer");

  // Form State Fields
  const [statementNo, setStatementNo] = useState("");
  const [dateIssued, setDateIssued] = useState("");
  const [tapstandNo, setTapstandNo] = useState("");
  const [tapstandLeader, setTapstandLeader] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [waterRate, setWaterRate] = useState("15.00");
  const [presentReading, setPresentReading] = useState("");
  const [previousReading, setPreviousReading] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [arrears, setArrears] = useState("0.00");
  const [surcharge, setSurcharge] = useState("0.00");
  const [others, setOthers] = useState("0.00");
  const [payBefore, setPayBefore] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  // Customer Autocomplete list
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Status States
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // References
  const receiptRef = useRef<HTMLDivElement>(null);

  // Fetch unique customers list on mount to allow autocomplete assistance
  useEffect(() => {
    loadCustomers();
    loadNextStatementNo();
  }, []);

  async function loadCustomers() {
    try {
      const list: Customer[] = await invoke("get_customers");
      setCustomers(list);
    } catch (e) {
      console.error("Failed to load customer list for autocomplete:", e);
    }
  }

  async function loadNextStatementNo() {
    try {
      const nextNo: string = await invoke("get_next_statement_no");
      setStatementNo(nextNo);
    } catch (e) {
      console.error("Failed to fetch next statement number:", e);
    }
  }

  // Handle autocomplete matching
  const filteredCustomers = customerName.trim()
    ? customers.filter((c) =>
        c.customer_name.toLowerCase().includes(customerName.toLowerCase())
      )
    : [];

  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(String(c.customer_name));
    setTapstandNo(c.tapstand_no);
    setTapstandLeader(c.tapstand_leader);
    setShowSuggestions(false);
  };

  // Math Calculations (Defensive math logic)
  const presVal = parseFloat(presentReading) || 0;
  const prevVal = parseFloat(previousReading) || 0;
  const rateVal = parseFloat(waterRate) || 0;
  const arrVal = parseFloat(arrears) || 0;
  const surVal = parseFloat(surcharge) || 0;
  const othVal = parseFloat(others) || 0;

  // Enforce zero or positive consumption
  const totalConsumption = Math.max(0, presVal - prevVal);
  const currentCharge = totalConsumption * rateVal;
  const totalAmount = currentCharge + arrVal + surVal + othVal;

  const handleClear = () => {
    loadNextStatementNo();
    setDateIssued("");
    setTapstandNo("");
    setTapstandLeader("");
    setCustomerName("");
    setWaterRate("15.00");
    setPresentReading("");
    setPreviousReading("");
    setPeriodFrom("");
    setPeriodTo("");
    setArrears("0.00");
    setSurcharge("0.00");
    setOthers("0.00");
    setPayBefore("");
    setReceivedBy("");
    setErrorMsg("");
    setSuccessMsg("");
    setActiveTab("customer");
  };

  // Form Validation & Database Save Trigger
  const handleSaveStatement = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    // Input Validations (Junior Blind-spot prevention)
    if (!statementNo.trim()) return setErrorMsg("Billing Statement No. is required.");
    if (!dateIssued) return setErrorMsg("Date Issued is required.");
    if (!customerName.trim()) return setErrorMsg("Customer Name is required.");
    if (!tapstandNo.trim()) return setErrorMsg("Tapstand No. is required.");
    if (!tapstandLeader.trim()) return setErrorMsg("Tapstand Leader is required.");
    if (rateVal <= 0) return setErrorMsg("Water rate must be greater than zero.");
    if (presVal < prevVal) return setErrorMsg("Present Reading cannot be less than Previous Reading.");
    if (!periodFrom || !periodTo) return setErrorMsg("Period From and To dates are required.");
    if (!payBefore) return setErrorMsg("Payment due date (Please Pay On/Before) is required.");

    setIsSaving(true);
    try {
      const payload = {
        statement_no: statementNo,
        date_issued: dateIssued,
        customer_name: customerName,
        tapstand_no: tapstandNo,
        tapstand_leader: tapstandLeader,
        water_rate: rateVal,
        present_reading: presVal,
        previous_reading: prevVal,
        total_consumption: totalConsumption,
        period_from: periodFrom,
        period_to: periodTo,
        arrears: arrVal,
        surcharge: surVal,
        others: othVal,
        total_amount: totalAmount,
        pay_before: payBefore,
        received_by: receivedBy.trim() ? receivedBy : null,
      };

      await invoke("save_billing_record", { record: payload });
      
      setSuccessMsg(`Billing Statement #${statementNo} saved and archived successfully!`);
      loadCustomers(); // Refresh autocomplete data
      loadNextStatementNo(); // Auto-increment/update statement no.
    } catch (e) {
      setErrorMsg(String(e));
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic receipt rendering capture helper (PNG Image Export)
  const handleExportPNG = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!receiptRef.current) return;

    let clone: HTMLDivElement | null = null;

    try {
      // Lazy load html2canvas in client context to avoid server-side compilation bundle conflicts
      const html2canvas = (await import("html2canvas-pro")).default;
      
      // Clone the element to render it fully without wrapper constraints
      clone = receiptRef.current.cloneNode(true) as HTMLDivElement;
      
      // Style clone to be off-screen/behind but fully sized
      clone.style.position = "fixed";
      clone.style.top = "0px";
      clone.style.left = "0px";
      clone.style.width = `${receiptRef.current.offsetWidth}px`;
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.zIndex = "-9999";
      clone.style.transform = "none";
      clone.style.transition = "none";
      clone.style.animation = "none";
      
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2, // Enhances print resolution
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `NEKFAWA_Bill_${statementNo || "Preview"}.png`;
      link.href = imgData;
      link.click();
      setSuccessMsg("Receipt saved successfully as PNG image!");
    } catch (e) {
      setErrorMsg(`Failed to render PNG image: ${e}`);
    } finally {
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
      {/* Left Column - Form Details Input */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
        
        {/* Form Wizard Navigation Tabs */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-4 rounded-t-2xl flex justify-between gap-1 select-none">
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "customer"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                : "text-slate-400 hover:text-slate-650"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>1. Customer Details</span>
          </button>
          
          <button
            onClick={() => setActiveTab("consumption")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "consumption"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                : "text-slate-400 hover:text-slate-650"
            }`}
          >
            <Droplet className="h-3.5 w-3.5" />
            <span>2. Meter & Rates</span>
          </button>
          
          <button
            onClick={() => setActiveTab("charges")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "charges"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                : "text-slate-400 hover:text-slate-650"
            }`}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>3. Adjustments & Dues</span>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Messaging Feedback bars */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-bold text-red-700 animate-pulse">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Customer Details */}
          {activeTab === "customer" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 mb-1">Customer & Account Details</h4>
                <p className="text-[11px] font-semibold text-slate-400">Initialize billing parameters and operator targets</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Billing Statement No.</label>
                  <input
                    type="text"
                    value={statementNo}
                    readOnly
                    title="Statement number is assigned automatically"
                    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date Issued</label>
                  <input
                    type="date"
                    value={dateIssued}
                    onChange={(e) => setDateIssued(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div className="col-span-2 relative">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Enter customer name to search..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                  {/* Autocomplete Popup */}
                  {showSuggestions && filteredCustomers.length > 0 && (
                    <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl divide-y divide-slate-50">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-950 transition-colors flex items-center gap-2.5 cursor-pointer"
                        >
                          <span className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px] text-emerald-600 font-extrabold shrink-0">
                            {c.customer_name.charAt(0).toUpperCase()}
                          </span>
                          <div className="flex-1">
                            <span className="block text-slate-800 font-bold">{String(c.customer_name)}</span>
                            <span className="block text-[10px] text-slate-400 font-medium">Tapstand: {c.tapstand_no} • Leader: {c.tapstand_leader}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tapstand No.</label>
                  <input
                    type="text"
                    value={tapstandNo}
                    onChange={(e) => setTapstandNo(e.target.value)}
                    placeholder="e.g. T5-08"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tapstand Leader</label>
                  <input
                    type="text"
                    value={tapstandLeader}
                    onChange={(e) => setTapstandLeader(e.target.value)}
                    placeholder="Leader name"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Consumption Details */}
          {activeTab === "consumption" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 mb-1">Consumption & Rates</h4>
                <p className="text-[11px] font-semibold text-slate-400">Calculate actual volume based on present and previous readings</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Previous Reading (m³)</label>
                  <input
                    type="number"
                    value={previousReading}
                    onChange={(e) => setPreviousReading(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Present Reading (m³)</label>
                  <input
                    type="number"
                    value={presentReading}
                    onChange={(e) => setPresentReading(e.target.value)}
                    placeholder="0.0"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Water Rate (PHP)</label>
                  <input
                    type="number"
                    value={waterRate}
                    onChange={(e) => setWaterRate(e.target.value)}
                    placeholder="15.00"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 flex flex-col justify-center select-none col-span-1">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Calculated Volume</span>
                  <span className="text-xl font-black text-emerald-950 mt-0.5">{totalConsumption.toFixed(1)} m³</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Period From</label>
                  <input
                    type="date"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Period To</label>
                  <input
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Adjustments & Dues */}
          {activeTab === "charges" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 mb-1">Adjustments & Final Dues</h4>
                <p className="text-[11px] font-semibold text-slate-400">Apply previous arrears, surcharges, and details sign-off</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Arrears (PHP)</label>
                  <input
                    type="number"
                    value={arrears}
                    onChange={(e) => setArrears(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Surcharge (PHP)</label>
                  <input
                    type="number"
                    value={surcharge}
                    onChange={(e) => setSurcharge(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Others (PHP)</label>
                  <input
                    type="number"
                    value={others}
                    onChange={(e) => setOthers(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Please Pay On/Before</label>
                  <input
                    type="date"
                    value={payBefore}
                    onChange={(e) => setPayBefore(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Received By (Optional)</label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Name of client or representative"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none transition-all duration-150"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Wizard Action Footer */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-4">
            <div>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-450 hover:bg-slate-50 hover:text-slate-650 transition-colors cursor-pointer"
              >
                Clear Form
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === "customer" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("consumption")}
                  className="flex items-center gap-1 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-slate-805 transition-colors cursor-pointer shadow-md shadow-slate-900/10"
                >
                  <span>Next: Consumption</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              {activeTab === "consumption" && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("customer")}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 text-slate-600 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("charges")}
                    className="flex items-center gap-1 rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-slate-805 transition-colors cursor-pointer shadow-md shadow-slate-900/10"
                  >
                    <span>Next: Charges</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              {activeTab === "charges" && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("consumption")}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 text-slate-600 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>
                  
                  <button
                    onClick={handleSaveStatement}
                    disabled={isSaving}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-emerald-500 disabled:bg-slate-200 transition-all duration-200 cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
                    )}
                    <span>Save Statement</span>
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Right Column - High-fidelity Paper Receipt Live Preview */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Receipt Container Wrapper */}
        <div 
          ref={receiptRef}
          className="relative bg-white p-6 shadow-xl border-t-8 border-emerald-500 rounded-b-2xl border-x border-slate-200 text-slate-900 leading-normal select-none font-mono"
          style={{ width: "100%", maxWidth: "440px", margin: "0 auto" }}
        >
          {/* Subtle Watermark Drop overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none z-0">
            <span className="text-[120px] font-black tracking-tight select-none rotate-12">NEKFAWA</span>
          </div>

          <div className="relative z-10">
            {/* Header Organization info */}
            <div className="text-center text-[10px] uppercase font-sans tracking-tight border-b border-dashed border-slate-300 pb-3.5 mb-4 font-bold">
              <h4 className="text-xs font-extrabold text-slate-800 leading-normal">
                New Katipunan Farmers and Workers Association (NEKFAWA)
              </h4>
              <p className="text-[9px] text-slate-500 font-medium lowercase first-letter:uppercase mt-0.5">Barangay New Katipunan, Matanao, Davao del Sur</p>
              <p className="text-[8px] text-slate-400 font-semibold font-sans mt-0.5">DOLE - Reg. Cert. No. ROXI-DSPO-WA-07-2015-687</p>
              <p className="text-[8px] text-slate-400 font-semibold font-sans">Date Registration: July 14, 2015 Digos City</p>
            </div>

            {/* Core Info Block */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="font-bold text-slate-450 text-[10px] uppercase tracking-wide">Billing Statement No:</span>
                <span className="font-extrabold text-red-650 tracking-wider">{statementNo || "--------"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-450 text-[10px] uppercase tracking-wide">Customer Name:</span>
                <span className="font-extrabold text-slate-800 uppercase tracking-wide">{customerName || "----------------"}</span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 text-[11px]">
                <div>
                  <span className="text-slate-450 font-bold uppercase text-[9px] block">Date Issued</span>{" "}
                  <span className="font-bold text-slate-800">{dateIssued || "---"}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-450 font-bold uppercase text-[9px] block">Present Reading</span>{" "}
                  <span className="font-extrabold text-slate-800">{presentReading ? `${presVal.toFixed(1)} m³` : "0.0 m³"}</span>
                </div>
                <div>
                  <span className="text-slate-450 font-bold uppercase text-[9px] block">Tapstand No.</span>{" "}
                  <span className="font-bold text-slate-800">{tapstandNo || "---"}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-450 font-bold uppercase text-[9px] block">Previous Reading</span>{" "}
                  <span className="font-extrabold text-slate-800">{previousReading ? `${prevVal.toFixed(1)} m³` : "0.0 m³"}</span>
                </div>
                <div>
                  <span className="text-slate-450 font-bold uppercase text-[9px] block">Tapstand Leader</span>{" "}
                  <span className="font-bold text-slate-800 truncate max-w-[130px] block">{tapstandLeader || "---"}</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-700 font-bold uppercase text-[9px] block">Total Consumption</span>{" "}
                  <span className="font-black text-emerald-800">{totalConsumption.toFixed(1)} m³</span>
                </div>
              </div>
            </div>

            {/* Statement Calculations Details Grid */}
            <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
              <div className="bg-slate-55/60 border-b border-slate-200 px-3.5 py-2 flex justify-between text-[10px] font-bold text-slate-650 font-sans">
                <span>PERIOD COVERED</span>
                <span className="tracking-wide">FROM: {periodFrom || "---"} TO: {periodTo || "---"}</span>
              </div>
              
              <div className="divide-y divide-slate-100 text-xs px-3.5 bg-slate-50/20">
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-450 uppercase text-[9px]">Current Charge</span>
                  <span className="font-bold text-slate-800">₱{currentCharge.toFixed(2)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-450 uppercase text-[9px]">Arrears</span>
                  <span className="font-bold text-slate-800">₱{arrVal.toFixed(2)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-450 uppercase text-[9px]">Surcharge</span>
                  <span className="font-bold text-slate-800">₱{surVal.toFixed(2)}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="font-bold text-slate-450 uppercase text-[9px]">Others</span>
                  <span className="font-bold text-slate-800">₱{othVal.toFixed(2)}</span>
                </div>
                <div className="py-3 flex justify-between bg-emerald-50/50 -mx-3.5 px-3.5 font-black text-emerald-800 text-sm border-t border-emerald-100">
                  <span className="uppercase text-[10px] font-extrabold tracking-wider">TOTAL AMOUNT DUE</span>
                  <span className="text-base font-black">₱{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Due warning */}
            <div className="mt-4 text-center select-none bg-red-50 border border-red-100/60 py-2 rounded-xl">
              <p className="text-xs font-black text-slate-800 font-sans">
                Please pay on/before: <span className="text-red-650 underline underline-offset-2">{payBefore || "----------------"}</span>
              </p>
            </div>

            {/* Notice Section */}
            <div className="mt-4 border border-dashed border-slate-300 p-3 rounded-xl bg-slate-50/50 text-center text-[9px] text-slate-500 font-sans leading-relaxed select-none">
              <span className="block font-black text-slate-700 mb-0.5 tracking-wider text-[10px] uppercase">NOTICE</span>
              Please bring this bill when making payments to our Office. If not paid on or before the date stated above, a surcharge shall be imposed and added to your bill.
            </div>

            {/* Signature/Acknowledgment Signoffs */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 gap-6 text-[10px] text-center font-bold text-slate-400 font-sans">
              <div>
                <div className="border-b border-slate-200 pb-1 font-bold text-slate-800 min-h-[16px]">{receivedBy || " "}</div>
                <span className="mt-1.5 block uppercase tracking-wider text-[8px] font-extrabold">Received By</span>
              </div>
              <div>
                <div className="border-b border-slate-200 pb-1 font-bold text-slate-800 min-h-[16px]">{dateIssued || " "}</div>
                <span className="mt-1.5 block uppercase tracking-wider text-[8px] font-extrabold">Date Received</span>
              </div>
            </div>
          </div>
        </div>

        {/* Download Action Button */}
        <button
          onClick={handleExportPNG}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/10 cursor-pointer"
        >
          <Receipt className="h-4.5 w-4.5" />
          <span>Save Receipt as Image (PNG)</span>
        </button>
      </div>
    </div>
  );
}
