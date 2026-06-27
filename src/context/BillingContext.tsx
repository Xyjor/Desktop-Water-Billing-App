import React, { createContext, useContext, useState, useEffect } from "react";
import { getBillingRecords, getDashboardStats, BillingRecord, DashboardStats } from "../services/billingService";

interface BillingContextType {
  records: BillingRecord[];
  stats: DashboardStats | null;
  isLoading: boolean;
  errorMsg: string;
  refreshAll: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

/**
 * BillingProvider Context Wrapper
 * Maintains a single, shared source of truth for billing history and aggregate stats.
 * Prevents redundant Tauri IPC queries and eliminates page flickering during navigation.
 */
export function BillingProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function formatError(e: any): string {
    if (typeof e === "string") {
      return e;
    }
    if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
      return e.message;
    }
    return "Failed to retrieve billing records.";
  }

  const refreshAll = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const [fetchedRecords, fetchedStats] = await Promise.all([
        getBillingRecords(),
        getDashboardStats(),
      ]);
      setRecords(fetchedRecords);
      setStats(fetchedStats);
    } catch (error) {
      console.error("[BillingContext] Failed to load data cache:", error);
      setErrorMsg(formatError(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Synchronize on application startup
  useEffect(() => {
    refreshAll();
  }, []);

  return (
    <BillingContext.Provider value={{ records, stats, isLoading, errorMsg, refreshAll }}>
      {children}
    </BillingContext.Provider>
  );
}

export function useBillingContext() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error("useBillingContext must be used within a BillingProvider");
  }
  return context;
}
