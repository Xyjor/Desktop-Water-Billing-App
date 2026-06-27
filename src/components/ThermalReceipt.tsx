import { RefObject } from "react";
import { BillingRecord } from "../services/billingService";

interface ThermalReceiptProps {
  record: BillingRecord;
  ref?: RefObject<HTMLDivElement | null>;
}

/**
 * ThermalReceipt Component
 * Renders the high-fidelity print/reprint thermal invoice preview.
 * Accepts a ref parameter directly (supported in React 19+) for canvas capture access.
 */
export default function ThermalReceipt({ record, ref }: ThermalReceiptProps) {
  return (
    <div 
      ref={ref}
      className="relative bg-white p-6 shadow-md border-t-8 border-emerald-500 rounded-b-xl border-x border-slate-200 text-slate-900 leading-normal font-mono select-none"
      style={{ width: "100%", maxWidth: "380px" }}
    >
      {/* Watermark logo background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none z-0">
        <span className="text-[100px] font-black tracking-tight select-none rotate-12">NEKFAWA</span>
      </div>

      <div className="relative z-10">
        {/* Header Association Profile */}
        <div className="text-center text-[9px] uppercase font-sans tracking-tight border-b border-dashed border-slate-300 pb-3 mb-4 font-bold">
          <h4 className="text-[11px] font-extrabold text-slate-800 leading-normal">
            New Katipunan Farmers and Workers Association (NEKFAWA)
          </h4>
          <p className="text-[8px] text-slate-500 font-medium lowercase first-letter:uppercase">Barangay New Katipunan, Matanao, Davao del Sur</p>
          <p className="text-[7.5px] text-slate-400 font-semibold font-sans mt-0.5">DOLE - Reg. Cert. No. ROXI-DSPO-WA-07-2015-687</p>
          <p className="text-[7.5px] text-slate-400 font-semibold font-sans">Date Registration: July 14, 2015 Digos City</p>
        </div>

        {/* Customer & Reading details */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="font-bold text-slate-455 text-[9px] uppercase">Statement ID:</span>
            <span className="font-extrabold text-red-650">{record.statement_no}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-1.5">
            <span className="font-bold text-slate-455 text-[9px] uppercase">Customer Name:</span>
            <span className="font-extrabold text-slate-805 uppercase">{record.customer_name}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1.5 text-[10.5px]">
            <div>
              <span className="text-slate-450 font-bold text-[8.5px] uppercase block">Date Issued</span>
              <span className="font-bold text-slate-800">{record.date_issued}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-450 font-bold text-[8.5px] uppercase block">Present Reading</span>
              <span className="font-bold text-slate-805">{record.present_reading.toFixed(1)} m³</span>
            </div>
            <div>
              <span className="text-slate-450 font-bold text-[8.5px] uppercase block">Tapstand Location</span>
              <span className="font-bold text-slate-800">#{record.tapstand_no}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-450 font-bold text-[8.5px] uppercase block">Previous Reading</span>
              <span className="font-bold text-slate-805">{record.previous_reading.toFixed(1)} m³</span>
            </div>
            <div>
              <span className="text-slate-450 font-bold text-[8.5px] uppercase block">Tapstand Leader</span>
              <span className="font-bold text-slate-800 truncate max-w-[110px] block">{record.tapstand_leader}</span>
            </div>
            <div className="text-right">
              <span className="text-emerald-700 font-bold text-[8.5px] uppercase block">Consumption Volume</span>
              <span className="font-black text-emerald-800">{record.total_consumption.toFixed(1)} m³</span>
            </div>
          </div>
        </div>

        {/* Charge Breakdown Card */}
        <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex justify-between text-[9px] font-bold text-slate-600 font-sans">
            <span>PERIOD COVERED</span>
            <span>FROM: {record.period_from} TO: {record.period_to}</span>
          </div>
          
          <div className="divide-y divide-slate-100 text-xs px-3 bg-slate-50/20">
            <div className="py-2 flex justify-between">
              <span className="font-bold text-slate-455 text-[9px] uppercase">Current Charge</span>
              <span className="font-bold text-slate-800">₱{(record.total_consumption * record.water_rate).toFixed(2)}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="font-bold text-slate-455 text-[9px] uppercase">Arrears</span>
              <span className="font-bold text-slate-800">₱{record.arrears.toFixed(2)}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="font-bold text-slate-455 text-[9px] uppercase">Others</span>
              <span className="font-bold text-slate-800">₱{record.others.toFixed(2)}</span>
            </div>
            <div className="py-2.5 flex justify-between bg-emerald-50/50 -mx-3 px-3 font-extrabold text-emerald-800 text-[12px] border-t border-emerald-100">
              <span className="text-[9.5px] uppercase font-bold tracking-wider">TOTAL DUE</span>
              <span className="font-black text-sm">₱{record.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notice & Due Dates */}
        <div className="mt-4 text-center text-[10.5px]">
          <p className="font-black text-slate-800 font-sans bg-red-50 py-1.5 rounded-lg border border-red-100/60">
            Please pay on/before: <span className="text-red-650 underline">{record.pay_before}</span>
          </p>
        </div>

        <div className="mt-4 border border-dashed border-slate-350 p-2.5 rounded-lg bg-slate-50/50 text-center text-[8.5px] text-slate-500 font-sans leading-tight">
          <span className="block font-black text-slate-700 mb-0.5 uppercase tracking-wide">NOTICE</span>
          Please bring this bill when making payments to our Office. If not paid on or before the date stated above, a surcharge shall be imposed and added to your bill.
        </div>

        {/* Representative Signatures */}
        <div className="mt-5 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-[9.5px] text-center font-bold text-slate-400 font-sans">
          <div>
            <div className="border-b border-slate-250 pb-1 font-bold text-slate-800 min-h-[14px]">{record.received_by || " "}</div>
            <span className="mt-1 block uppercase text-[8px] tracking-wider font-extrabold">Received By</span>
          </div>
          <div>
            <div className="border-b border-slate-250 pb-1 font-bold text-slate-800 min-h-[14px]">{record.date_issued}</div>
            <span className="mt-1 block uppercase text-[8px] tracking-wider font-extrabold">Date</span>
          </div>
        </div>
      </div>
    </div>
  );
}
