import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ApiError,
  uploadInvoices,
  getInvoiceStatus,
  approveInvoice,
  exportInvoice,
  updateInvoice,
  updateOrgSettings,
} from "./api-client";

// ---------------------------------------------------------------------------
// Mock global fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob()),
    headers: new Headers(),
  } as unknown as Response;
}

function errorResponse(status: number, body?: unknown): Response {
  return {
    ok: false,
    status,
    json: body
      ? () => Promise.resolve(body)
      : () => Promise.reject(new Error("not json")),
    headers: new Headers(),
  } as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

describe("ApiError", () => {
  it("stores status and message", () => {
    const err = new ApiError("Not found", 404);
    expect(err.message).toBe("Not found");
    expect(err.status).toBe(404);
    expect(err.name).toBe("ApiError");
  });

  it("stores optional details", () => {
    const details = { field: "vendor_name" };
    const err = new ApiError("Validation failed", 422, details);
    expect(err.details).toEqual(details);
  });
});

// ---------------------------------------------------------------------------
// uploadInvoices
// ---------------------------------------------------------------------------

describe("uploadInvoices", () => {
  it("sends FormData with files to /api/invoices/upload", async () => {
    const file1 = new File(["pdf-content"], "invoice1.pdf", {
      type: "application/pdf",
    });
    const file2 = new File(["pdf-content"], "invoice2.pdf", {
      type: "application/pdf",
    });

    mockFetch.mockResolvedValue(
      jsonResponse({ uploaded: 2, invoiceIds: ["id1", "id2"] })
    );

    const result = await uploadInvoices([file1, file2]);

    expect(mockFetch).toHaveBeenCalledWith("/api/invoices/upload", {
      method: "POST",
      body: expect.any(FormData),
    });

    // Verify FormData contains both files
    const formData = mockFetch.mock.calls[0][1].body as FormData;
    const files = formData.getAll("files");
    expect(files).toHaveLength(2);

    expect(result).toEqual({ uploaded: 2, invoiceIds: ["id1", "id2"] });
  });

  it("throws ApiError on failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(413, { error: { message: "File too large" } })
    );

    await expect(
      uploadInvoices([new File(["x"], "big.pdf")])
    ).rejects.toThrow(ApiError);
  });

  it("optionally includes file_ids for per-file result mapping", async () => {
    const file = new File(["pdf-content"], "invoice1.pdf", {
      type: "application/pdf",
    });

    mockFetch.mockResolvedValue(
      jsonResponse({ uploaded: 1, invoiceIds: ["id1"], results: [] })
    );

    await uploadInvoices([file], ["client-1"]);

    const formData = mockFetch.mock.calls[0][1].body as FormData;
    expect(formData.getAll("file_ids")).toEqual(["client-1"]);
  });
});

// ---------------------------------------------------------------------------
// getInvoiceStatus
// ---------------------------------------------------------------------------

describe("getInvoiceStatus", () => {
  it("fetches invoice status payload", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({
        id: "inv_001",
        status: "processing",
        processing_stage: "ocr",
        progress: 45,
        error_message: null,
      })
    );

    const result = await getInvoiceStatus("inv_001");

    expect(mockFetch).toHaveBeenCalledWith("/api/invoices/inv_001/status", {
      method: "GET",
    });
    expect(result).toEqual({
      id: "inv_001",
      status: "processing",
      processing_stage: "ocr",
      progress: 45,
      error_message: null,
    });
  });
});

// ---------------------------------------------------------------------------
// getInvoiceStatus
// ---------------------------------------------------------------------------

describe("getInvoiceStatus", () => {
  it("sends GET to /api/invoices/{id}/status", async () => {
    const payload = {
      id: "inv_001",
      status: "processing",
      progress: 42,
      processing_stage: "ocr",
      error_message: null,
      updated_at: "2026-02-16T00:00:00.000Z",
    };
    mockFetch.mockResolvedValue(jsonResponse(payload));

    const result = await getInvoiceStatus("inv_001");

    expect(mockFetch).toHaveBeenCalledWith("/api/invoices/inv_001/status", {
      method: "GET",
    });
    expect(result).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// approveInvoice
// ---------------------------------------------------------------------------

describe("approveInvoice", () => {
  it("sends POST to /api/invoices/{id}/approve", async () => {
    mockFetch.mockResolvedValue(jsonResponse(undefined, 204));

    await approveInvoice("inv_001");

    expect(mockFetch).toHaveBeenCalledWith("/api/invoices/inv_001/approve", {
      method: "POST",
    });
  });

  it("throws ApiError when invoice cannot be approved", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(409, { detail: "Invoice already approved" })
    );

    await expect(approveInvoice("inv_002")).rejects.toThrow(ApiError);
  });
});

// ---------------------------------------------------------------------------
// exportInvoice
// ---------------------------------------------------------------------------

describe("exportInvoice", () => {
  it("sends POST and returns a Blob", async () => {
    const blob = new Blob(["excel-data"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    } as unknown as Response);

    const result = await exportInvoice("inv_002");

    expect(mockFetch).toHaveBeenCalledWith("/api/invoices/inv_002/export", {
      method: "POST",
    });
    expect(result).toBeInstanceOf(Blob);
  });

  it("throws ApiError on export failure", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { detail: "Invoice not approved" })
    );

    await expect(exportInvoice("inv_001")).rejects.toThrow(ApiError);
  });
});

// ---------------------------------------------------------------------------
// updateInvoice
// ---------------------------------------------------------------------------

describe("updateInvoice", () => {
  it("sends PUT with JSON body", async () => {
    const updated = { id: "inv_001", vendor_name: "Updated Vendor" };
    mockFetch.mockResolvedValue(jsonResponse(updated));

    const result = await updateInvoice("inv_001", {
      vendor_name: "Updated Vendor",
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/invoices/inv_001", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendor_name: "Updated Vendor" }),
    });
    expect(result).toEqual(updated);
  });

  it("throws ApiError on 404", async () => {
    mockFetch.mockResolvedValue(errorResponse(404));

    await expect(
      updateInvoice("inv_nonexistent", { vendor_name: "X" })
    ).rejects.toThrow(ApiError);
  });
});

// ---------------------------------------------------------------------------
// updateOrgSettings
// ---------------------------------------------------------------------------

describe("updateOrgSettings", () => {
  it("sends PUT to /api/settings", async () => {
    const payload = {
      organization: { id: "org_001", name: "New Name" },
      locations: [],
    };
    mockFetch.mockResolvedValue(jsonResponse(payload));

    const result = await updateOrgSettings({ name: "New Name" });

    expect(mockFetch).toHaveBeenCalledWith("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(result).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// Error message extraction
// ---------------------------------------------------------------------------

describe("error message extraction", () => {
  it("extracts error.message from structured error body", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(400, { error: { message: "Custom error" } })
    );

    try {
      await approveInvoice("inv_001");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe("Custom error");
      expect((err as ApiError).status).toBe(400);
    }
  });

  it("extracts detail from FastAPI-style error body", async () => {
    mockFetch.mockResolvedValue(
      errorResponse(422, { detail: "Validation error" })
    );

    try {
      await approveInvoice("inv_001");
    } catch (err) {
      expect((err as ApiError).message).toBe("Validation error");
    }
  });

  it("falls back to generic message when body is not JSON", async () => {
    mockFetch.mockResolvedValue(errorResponse(500));

    try {
      await approveInvoice("inv_001");
    } catch (err) {
      expect((err as ApiError).message).toBe("Request failed (500)");
    }
  });
});
