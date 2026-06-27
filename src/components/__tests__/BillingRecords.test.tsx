import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import BillingRecords from "../BillingRecords";
import { invoke } from "@tauri-apps/api/core";
import { BillingProvider } from "../../context/BillingContext";

// Wrap all test renderings inside BillingProvider context wrapper
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: BillingProvider });

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock html2canvas-pro
const mockCanvas = {
  toDataURL: vi.fn().mockReturnValue("data:image/png;base64,mockPngBase64"),
};
vi.mock("html2canvas-pro", () => ({
  default: vi.fn().mockImplementation(() => Promise.resolve(mockCanvas)),
}));

const mockRecords = [
  {
    id: 1,
    statement_no: "ST-001",
    date_issued: "2026-06-01",
    customer_name: "JUAN DELA CRUZ",
    tapstand_no: "TS-10",
    tapstand_leader: "PEDRO PENDUKO",
    water_rate: 15.0,
    present_reading: 120.0,
    previous_reading: 100.0,
    total_consumption: 20.0,
    period_from: "2026-05-01",
    period_to: "2026-05-31",
    arrears: 50.0,
    surcharge: 10.0,
    others: 0.0,
    total_amount: 360.0,
    pay_before: "2026-06-15",
    received_by: "MARIA CLARA",
  },
  {
    id: 2,
    statement_no: "ST-002",
    date_issued: "2026-06-02",
    customer_name: "JOHN DOE",
    tapstand_no: "TS-20",
    tapstand_leader: "JANE SMITH",
    water_rate: 15.0,
    present_reading: 150.0,
    previous_reading: 140.0,
    total_consumption: 10.0,
    period_from: "2026-05-01",
    period_to: "2026-05-31",
    arrears: 0.0,
    surcharge: 0.0,
    others: 5.0,
    total_amount: 155.0,
    pay_before: "2026-06-15",
    received_by: null,
  },
];

describe("BillingRecords Component Tests", () => {
  let clickSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on HTMLAnchorElement click event to verify downloads
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    // Provide robust default mock implementations to satisfy the Context loading calls
    vi.mocked(invoke).mockImplementation(async (cmd) => {
      if (cmd === "get_session") {
        return {
          username: "admin",
          role: "ADMIN",
          must_change_password: false,
        };
      }
      if (cmd === "get_billing_records") {
        return mockRecords;
      }
      if (cmd === "get_dashboard_stats") {
        return {
          total_statements: 2,
          total_consumption: 30.0,
          total_amount: 515.0,
          unique_tapstands: 2,
        };
      }
      return [];
    });
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  // ==================== Happy Paths ====================

  it("should display loading state and invoke get_billing_records on mount", async () => {
    // Reset mock to empty records to see loading
    vi.mocked(invoke).mockImplementationOnce(async () => []);

    render(<BillingRecords />);

    expect(screen.getByText("Loading archive database...")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("get_billing_records");

    await waitFor(() => {
      expect(screen.queryByText("Loading archive database...")).not.toBeInTheDocument();
    });
  });

  it("should render list of billing records on successful fetch", async () => {
    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    expect(screen.getByText("JUAN DELA CRUZ")).toBeInTheDocument();
    expect(screen.getByText("ST-002")).toBeInTheDocument();
    expect(screen.getByText("JOHN DOE")).toBeInTheDocument();
    expect(screen.getByText("₱360.00")).toBeInTheDocument();
    expect(screen.getByText("₱155.00")).toBeInTheDocument();
  });

  it("should filter records by customer name, statement number, or tapstand number", async () => {
    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search statements/i);

    // Search by customer name
    fireEvent.change(searchInput, { target: { value: "JUAN" } });
    expect(screen.getByText("JUAN DELA CRUZ")).toBeInTheDocument();
    expect(screen.queryByText("JOHN DOE")).not.toBeInTheDocument();

    // Search by tapstand number
    fireEvent.change(searchInput, { target: { value: "TS-20" } });
    expect(screen.getByText("JOHN DOE")).toBeInTheDocument();
    expect(screen.queryByText("JUAN DELA CRUZ")).not.toBeInTheDocument();

    // Search by statement no
    fireEvent.change(searchInput, { target: { value: "ST-001" } });
    expect(screen.getByText("JUAN DELA CRUZ")).toBeInTheDocument();
    expect(screen.queryByText("JOHN DOE")).not.toBeInTheDocument();
  });

  it("should open details modal when clicking View Details", async () => {
    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[0]); // Click first record view

    expect(screen.getByText("Statement Invoice Details")).toBeInTheDocument();
    expect(screen.getAllByText("PEDRO PENDUKO").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MARIA CLARA").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("TOTAL DUE")).toBeInTheDocument();
  });

  it("should close details modal when clicking Close View or close button", async () => {
    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[0]);

    expect(screen.getByText("Statement Invoice Details")).toBeInTheDocument();

    const closeBtn = screen.getByText("Close View");
    fireEvent.click(closeBtn);

    expect(screen.queryByText("Statement Invoice Details")).not.toBeInTheDocument();
  });

  it("should export PNG successfully when clicking Save Reprint Copy", async () => {
    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[0]);

    const exportBtn = screen.getByText("Save Reprint Copy (PNG)");
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText("Receipt reprinted successfully!")).toBeInTheDocument();
    });

    expect(clickSpy).toHaveBeenCalled();
  });

  // ==================== Edge Cases & Boundaries ====================

  it("should display empty state when no records match search query", async () => {
    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search statements/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentName" } });

    expect(screen.getByText("No records matching search query")).toBeInTheDocument();
    expect(screen.queryByText("JUAN DELA CRUZ")).not.toBeInTheDocument();
  });

  it("should disable refresh button while database is loading", async () => {
    let resolveRecords: any;
    const recordsPromise = new Promise((resolve) => {
      resolveRecords = resolve;
    });
    // Intercept mock specifically for database load
    vi.mocked(invoke).mockImplementationOnce(() => recordsPromise as any);

    render(<BillingRecords />);

    const refreshBtn = screen.getByRole("button", { name: /Refresh Database/i });
    expect(refreshBtn).toBeDisabled();

    // Finish loading
    resolveRecords([]);
    await waitFor(() => {
      expect(refreshBtn).not.toBeDisabled();
    });
  });

  it("should handle null received_by gracefully in details modal", async () => {
    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-002")).toBeInTheDocument();
    });

    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[1]); // Click second record (received_by: null)

    expect(screen.getByText("Statement Invoice Details")).toBeInTheDocument();
    
    // The "Acknowledgment Sign-off" heading should not be present in the details modal
    expect(screen.queryByText("Acknowledgment Sign-off")).not.toBeInTheDocument();
  });

  it("should render zero, negative, and large boundary values correctly in table list and details modal", async () => {
    const boundaryRecords = [
      {
        id: 3,
        statement_no: "ST-BOUND",
        date_issued: "2026-06-03",
        customer_name: "EXTREME VALUES USER",
        tapstand_no: "TS-99",
        tapstand_leader: "LEADER OUT-OF-BOUNDS",
        water_rate: 9999.99,
        present_reading: 100000.0,
        previous_reading: 100000.0,
        total_consumption: 0.0, // Zero consumption
        period_from: "2026-05-01",
        period_to: "2026-05-31",
        arrears: -150.50, // Negative arrears (credit balance)
        surcharge: 0.0,
        others: 0.0,
        total_amount: -150.50,
        pay_before: "2026-06-15",
        received_by: "CASHIER ONE",
      }
    ];

    vi.mocked(invoke).mockImplementationOnce(async (cmd) => {
      if (cmd === "get_billing_records") return boundaryRecords;
      return [];
    });

    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-BOUND")).toBeInTheDocument();
    });

    // Verify negative values format correctly
    expect(screen.getByText("₱-150.50")).toBeInTheDocument();
    expect(screen.getByText("0.0 m³")).toBeInTheDocument();

    const viewDetailsBtn = screen.getByText("View Details");
    fireEvent.click(viewDetailsBtn);

    // Verify modal elements
    expect(screen.getAllByText("0.0 m³").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("₱9999.99/m³")).toBeInTheDocument();
    expect(screen.getAllByText("₱-150.50").length).toBeGreaterThanOrEqual(1);
  });

  it("should disable export button while exporting is in progress", async () => {
    // Mock html2canvas-pro to return a promise that we can control
    let resolveCanvas: any;
    const canvasPromise = new Promise((resolve) => {
      resolveCanvas = resolve;
    });
    const html2canvasModule = await import("html2canvas-pro");
    vi.mocked(html2canvasModule.default).mockImplementationOnce(() => canvasPromise as any);

    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[0]);

    const exportBtn = screen.getByRole("button", { name: /Save Reprint Copy/i });
    fireEvent.click(exportBtn);

    // Expect it to be disabled while canvas is rendering
    expect(exportBtn).toBeDisabled();

    // Resolve the canvas promise
    resolveCanvas(mockCanvas);

    await waitFor(() => {
      expect(exportBtn).not.toBeDisabled();
    });
  });

  // ==================== Failure Paths & Robustness ====================

  it("should handle error gracefully if get_billing_records fails", async () => {
    const errorReason = "Database connection timed out";
    vi.mocked(invoke).mockImplementationOnce(async () => {
      throw errorReason;
    });

    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.queryByText("Loading archive database...")).not.toBeInTheDocument();
    });

    expect(screen.getByText(errorReason)).toBeInTheDocument();
  });

  it("should handle different format types of get_billing_records failures", async () => {
    // 1. Rejected with an object containing a message property
    vi.mocked(invoke).mockImplementationOnce(async () => {
      throw { message: "Network connection refused" };
    });

    const { unmount } = render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.queryByText("Loading archive database...")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Network connection refused")).toBeInTheDocument();
    unmount();

    // 2. Rejected with an object that has NO message property
    vi.mocked(invoke).mockImplementationOnce(async () => {
      throw { code: 500 };
    });

    const renderResult2 = render(<BillingRecords />);

    await waitFor(() => {
      expect(renderResult2.queryByText("Loading archive database...")).not.toBeInTheDocument();
    });
    expect(renderResult2.getByText("Failed to retrieve billing records.")).toBeInTheDocument();
    renderResult2.unmount();

    // 3. Rejected with null/undefined
    vi.mocked(invoke).mockImplementationOnce(async () => {
      throw null;
    });

    const renderResult3 = render(<BillingRecords />);

    await waitFor(() => {
      expect(renderResult3.queryByText("Loading archive database...")).not.toBeInTheDocument();
    });
    expect(renderResult3.getByText("Failed to retrieve billing records.")).toBeInTheDocument();
  });

  it("should alert error when export PNG fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    // Mock html2canvas-pro to reject
    const html2canvasModule = await import("html2canvas-pro");
    vi.mocked(html2canvasModule.default).mockRejectedValueOnce(new Error("Canvas failure"));

    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[0]);

    const exportBtn = screen.getByText("Save Reprint Copy (PNG)");
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Export failure: Error: Canvas failure");
    });

    alertSpy.mockRestore();
  });

  it("should clone receipt off-screen before capture to avoid modal clipping", async () => {
    const html2canvasModule = await import("html2canvas-pro");

    render(<BillingRecords />);

    await waitFor(() => {
      expect(screen.getByText("ST-001")).toBeInTheDocument();
    });

    const viewDetailsBtns = screen.getAllByText("View Details");
    fireEvent.click(viewDetailsBtns[0]);

    const modalReceipt = screen
      .getByText(/New Katipunan Farmers and Workers Association/)
      .closest("div[class*='border-emerald-500']") as HTMLDivElement;

    const exportBtn = screen.getByText("Save Reprint Copy (PNG)");
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText("Receipt reprinted successfully!")).toBeInTheDocument();
    });

    expect(html2canvasModule.default).toHaveBeenCalled();
    const passedElement = vi.mocked(html2canvasModule.default).mock.calls[0][0] as HTMLDivElement;
    expect(passedElement).toBeInstanceOf(HTMLElement);
    expect(passedElement).not.toBe(modalReceipt);
    expect(passedElement.style.position).toBe("fixed");
    expect(passedElement.style.maxHeight).toBe("none");
    expect(passedElement.style.overflow).toBe("visible");
    expect(passedElement.textContent).toMatch(/New Katipunan Farmers and Workers Association/);
    expect(clickSpy).toHaveBeenCalled();
  });
});
