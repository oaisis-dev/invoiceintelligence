import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertLocationAccess: vi.fn(),
}));

vi.mock("@/lib/gcp/storage", () => ({
  downloadFromGcs: vi.fn(),
}));

vi.mock("@/lib/image-preview", () => ({
  convertTiffToPng: vi.fn(),
}));

import { assertLocationAccess, requireAuthContext } from "@/lib/authz";
import { downloadFromGcs } from "@/lib/gcp/storage";
import { convertTiffToPng } from "@/lib/image-preview";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertLocationAccess = vi.mocked(assertLocationAccess);
const mockedDownloadFromGcs = vi.mocked(downloadFromGcs);
const mockedConvertTiffToPng = vi.mocked(convertTiffToPng);
const mockedFetch = vi.fn();

function createInvoiceBuilder(invoice: {
  stored_path: string;
  original_filename: string;
  location_id: string | null;
}) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(async () => ({ data: invoice, error: null }));
  return builder;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mockedFetch);
  mockedAssertLocationAccess.mockReturnValue(null);
  mockedDownloadFromGcs.mockResolvedValue(Buffer.from("test-binary"));
  mockedConvertTiffToPng.mockResolvedValue(Buffer.from("png-binary"));
  mockedFetch.mockResolvedValue(
    new Response(Buffer.from("absolute-path-binary"), { status: 200 })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/invoices/[id]/pdf", () => {
  it("returns PDF content type for PDF invoices", async () => {
    const invoicesBuilder = createInvoiceBuilder({
      stored_path: "invoices/inv-1/source.pdf",
      original_filename: "source.pdf",
      location_id: "loc-1",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(mockedDownloadFromGcs).toHaveBeenCalledWith("invoices/inv-1/source.pdf");
  });

  it("returns browser-renderable PNG content type for TIFF invoices", async () => {
    const invoicesBuilder = createInvoiceBuilder({
      stored_path: "invoices/inv-2/source.tiff",
      original_filename: "source.tiff",
      location_id: "loc-1",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-2" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(mockedConvertTiffToPng).toHaveBeenCalled();
  });

  it("returns location guard response when location access fails", async () => {
    const invoicesBuilder = createInvoiceBuilder({
      stored_path: "invoices/inv-3/source.png",
      original_filename: "source.png",
      location_id: "loc-2",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    mockedAssertLocationAccess.mockReturnValue(
      NextResponse.json(
        { error: { code: "LOCATION_SCOPE_VIOLATION" } },
        { status: 403 }
      )
    );

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-3" }),
    });

    expect(response.status).toBe(403);
  });

  it("redirects when stored_path is already an absolute URL", async () => {
    const invoicesBuilder = createInvoiceBuilder({
      stored_path: "https://storage.googleapis.com/bucket/path/source.png?sig=abc",
      original_filename: "source.png",
      location_id: "loc-1",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-4" }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "https://storage.googleapis.com/bucket/path/source.png"
    );
    expect(mockedDownloadFromGcs).not.toHaveBeenCalled();
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("converts absolute TIFF URLs to PNG for browser preview", async () => {
    const invoicesBuilder = createInvoiceBuilder({
      stored_path: "https://storage.googleapis.com/bucket/path/source.tiff?sig=abc",
      original_filename: "source.tiff",
      location_id: "loc-1",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-6" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://storage.googleapis.com/bucket/path/source.tiff?sig=abc"
    );
    expect(mockedDownloadFromGcs).not.toHaveBeenCalled();
    expect(mockedConvertTiffToPng).toHaveBeenCalled();
  });

  it("falls back to original TIFF when conversion fails", async () => {
    mockedConvertTiffToPng.mockRejectedValue(new Error("conversion failed"));
    const invoicesBuilder = createInvoiceBuilder({
      stored_path: "invoices/inv-5/source.tiff",
      original_filename: "source.tiff",
      location_id: "loc-1",
    });

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        supabase: {
          from: vi.fn(() => invoicesBuilder),
        },
      } as never,
      error: null,
    });

    const response = await GET(new Request("http://localhost") as never, {
      params: Promise.resolve({ id: "inv-5" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/tiff");
  });
});
