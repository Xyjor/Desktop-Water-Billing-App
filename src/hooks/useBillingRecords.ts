import { useState, useMemo } from "react";
import { useBillingContext } from "../context/BillingContext";
import { BillingRecord } from "../services/billingService";

/**
 * Custom hook useBillingRecords
 * Delegates state storage, loading triggers, and caching to BillingContext.
 * Performs local memoization for user search entries and handles receipt exports.
 */
export function useBillingRecords() {
  const { records, isLoading, errorMsg, refreshAll } = useBillingContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Memoize filtered records to prevent redundant calculations during unrelated re-renders
  // Separation of Concerns: Local search inputs are handled here; database arrays come from Context.
  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return records;
    return records.filter((r) =>
      (r.customer_name ?? "").toLowerCase().includes(term) ||
      (r.tapstand_no ?? "").toLowerCase().includes(term) ||
      (r.statement_no ?? "").toLowerCase().includes(term)
    );
  }, [records, searchTerm]);

  /**
   * Generates and downloads a PNG image copy of the thermal receipt element.
   * Performs dynamic rendering using html2canvas-pro with balanced DOM attachment and cleanup.
   */
  const handleExportPNG = async (receiptElement: HTMLDivElement | null) => {
    setExportSuccessMsg("");
    if (!receiptElement || !selectedRecord) {
      console.warn("[useBillingRecords] Export canceled: element or record reference is null.");
      return;
    }

    setIsExporting(true);

    let clone: HTMLDivElement | null = null;

    try {
      // Dynamic import to optimize initial application bundle size
      const html2canvas = (await import("html2canvas-pro")).default;

      // Clone off-screen so modal scroll/max-height wrappers do not clip the capture
      clone = receiptElement.cloneNode(true) as HTMLDivElement;
      clone.style.position = "fixed";
      clone.style.top = "0px";
      clone.style.left = "0px";
      clone.style.width = `${receiptElement.offsetWidth}px`;
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.zIndex = "-9999";
      clone.style.transform = "none";
      clone.style.transition = "none";
      clone.style.animation = "none";

      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
      });

      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `NEKFAWA_Bill_${selectedRecord.statement_no}.png`;
      link.href = imgData;
      link.click();
      
      setExportSuccessMsg("Receipt reprinted successfully!");
      setTimeout(() => setExportSuccessMsg(""), 2000);
    } catch (e) {
      // Explicit error logging & alerting for production failure scenarios
      console.error("[useBillingRecords] Export reprint operation failed:", e);
      alert(`Export failure: ${e}`);
    } finally {
      if (clone && document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      setIsExporting(false);
    }
  };

  return {
    records,
    searchTerm,
    setSearchTerm,
    selectedRecord,
    setSelectedRecord,
    isLoading,
    errorMsg,
    exportSuccessMsg,
    isExporting,
    fetchRecords: refreshAll,
    filteredRecords,
    handleExportPNG,
  };
}
