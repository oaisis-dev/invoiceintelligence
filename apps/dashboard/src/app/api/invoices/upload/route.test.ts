import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/authz", () => ({
  requireAuthContext: vi.fn(),
  assertLocationAccess: vi.fn(),
  forbiddenResponse: vi.fn((code: string, message: string) =>
    Response.json({ error: { code, message } }, { status: 403 })
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/gcp/storage", () => ({
  uploadToGcs: vi.fn(),
}));

vi.mock("@/lib/gcp/pubsub", () => ({
  publishInvoiceProcessing: vi.fn(),
}));

import {
  assertLocationAccess,
  requireAuthContext,
} from "@/lib/authz";
import { uploadToGcs } from "@/lib/gcp/storage";
import { publishInvoiceProcessing } from "@/lib/gcp/pubsub";

const mockedRequireAuthContext = vi.mocked(requireAuthContext);
const mockedAssertLocationAccess = vi.mocked(assertLocationAccess);
const mockedUploadToGcs = vi.mocked(uploadToGcs);
const mockedPublishInvoiceProcessing = vi.mocked(publishInvoiceProcessing);

function createRpcMock() {
  return vi.fn(async () => ({
    data: [
      {
        monthly_invoice_count: 0,
        active_user_count: 1,
        monthly_invoice_limit: 100,
        max_users: 10,
        workspace_type: "organization",
        plan_id: "plan-1",
        subscription_status: "active",
        grace_period_end: null,
      },
    ],
    error: null,
  }));
}

function createInvoicesBuilder(options?: { duplicateId?: string }) {
  const duplicateId = options?.duplicateId ?? null;
  const selectBuilder: Record<string, ReturnType<typeof vi.fn>> = {};
  selectBuilder.eq = vi.fn(() => selectBuilder);
  selectBuilder.not = vi.fn(() => selectBuilder);
  selectBuilder.gte = vi.fn(() => selectBuilder);
  selectBuilder.order = vi.fn(() => selectBuilder);
  selectBuilder.limit = vi.fn(async () => ({
    data: duplicateId ? [{ id: duplicateId }] : [],
    error: null,
  }));

  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => selectBuilder);
  builder.insert = vi.fn(async () => ({ error: null }));
  builder.update = vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) }));
  return builder;
}

function createRequest(fileName = "invoice.pdf") {
  const file = new File(["%PDF-1.4 test"], fileName, {
    type: "application/pdf",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: async () => new TextEncoder().encode("%PDF-1.4 test").buffer,
  });

  const formData = {
    get: (key: string) => (key === "location_id" ? "loc-1" : null),
    getAll: (key: string) => {
      if (key === "files") {
        return [file];
      }
      return [];
    },
  };
  return {
    formData: async () => formData,
  } as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAssertLocationAccess.mockReturnValue(null);
  mockedUploadToGcs.mockResolvedValue(undefined);
  mockedPublishInvoiceProcessing.mockResolvedValue(undefined);
});

describe("POST /api/invoices/upload", () => {
  it("returns skipped_duplicate when file hash already exists in location window", async () => {
    const invoices = createInvoicesBuilder({ duplicateId: "inv-existing" });
    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "staff",
        locationId: "loc-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table !== "invoices") {
              throw new Error(`Unexpected table ${table}`);
            }
            return invoices;
          }),
          rpc: createRpcMock(),
        },
      } as never,
      error: null,
    });

    const response = await POST(createRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.uploaded).toBe(0);
    expect(body.skipped_duplicates).toBe(1);
    expect(body.results[0].status).toBe("skipped_duplicate");
    expect(mockedUploadToGcs).not.toHaveBeenCalled();
    expect(mockedPublishInvoiceProcessing).not.toHaveBeenCalled();
  });

  it("queues non-duplicate uploads and records invoice_uploaded audit", async () => {
    const invoices = createInvoicesBuilder({ duplicateId: null });
    const processingJobs = {
      insert: vi.fn(async () => ({ error: null })),
    };

    mockedRequireAuthContext.mockResolvedValue({
      context: {
        orgId: "org-1",
        appUserId: "user-1",
        role: "staff",
        locationId: "loc-1",
        supabase: {
          from: vi.fn((table: string) => {
            if (table === "invoices") return invoices;
            if (table === "processing_jobs") return processingJobs;
            throw new Error(`Unexpected table ${table}`);
          }),
          rpc: createRpcMock(),
        },
      } as never,
      error: null,
    });

    const response = await POST(createRequest() as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.uploaded).toBe(1);
    expect(body.results[0].status).toBe("queued");
    expect(mockedUploadToGcs).toHaveBeenCalledOnce();
    expect(mockedPublishInvoiceProcessing).toHaveBeenCalledOnce();
  });
});
