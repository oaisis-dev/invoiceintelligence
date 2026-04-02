import type {
  Invoice,
  InvoiceLineItem,
  InvoiceWithLineItems,
  DashboardStats,
  ProcessingJob,
  Organization,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Shared test fixtures for invoice-related data.
// All fields match the types in src/types/database.ts.
// ---------------------------------------------------------------------------

export const mockOrganization: Organization = {
  id: "org_001",
  name: "Test Restaurant Group",
  slug: "test-restaurant-group",
  workspace_type: "organization",
  logo_url: null,
  settings: {},
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

export const mockInvoice: Invoice = {
  id: "inv_001",
  org_id: "org_001",
  location_id: "loc_001",
  status: "ready_for_review",
  processing_stage: null,
  source: "web_upload",
  vendor_name: "Sysco Foods",
  invoice_number: "INV-2025-0042",
  invoice_date: "2025-06-15",
  total_amount: 1234.56,
  original_filename: "sysco-june-delivery.pdf",
  stored_path: "invoices/org_001/inv_001.pdf",
  metadata: {},
  raw_text: null,
  confidence_scores: { overall: 0.95 },
  error_message: null,
  uploaded_by: "user_001",
  approved_by: null,
  uploaded_at: "2025-06-15T14:30:00Z",
  processed_at: "2025-06-15T14:32:00Z",
  approved_at: null,
  exported_at: null,
  rejection_note: null,
  progress: 100,
  created_at: "2025-06-15T14:30:00Z",
  updated_at: "2025-06-15T14:32:00Z",
};

export const mockApprovedInvoice: Invoice = {
  ...mockInvoice,
  id: "inv_002",
  status: "approved",
  vendor_name: "US Foods",
  invoice_number: "USF-88123",
  invoice_date: "2025-06-14",
  total_amount: 2567.89,
  original_filename: "usfoods-weekly.pdf",
  stored_path: "invoices/org_001/inv_002.pdf",
  approved_by: "user_001",
  approved_at: "2025-06-15T16:00:00Z",
  uploaded_at: "2025-06-14T09:00:00Z",
  processed_at: "2025-06-14T09:05:00Z",
  created_at: "2025-06-14T09:00:00Z",
  updated_at: "2025-06-15T16:00:00Z",
};

export const mockFailedInvoice: Invoice = {
  ...mockInvoice,
  id: "inv_003",
  status: "failed",
  processing_stage: "extraction",
  vendor_name: null,
  invoice_number: null,
  invoice_date: null,
  total_amount: null,
  original_filename: "blurry-scan.pdf",
  stored_path: "invoices/org_001/inv_003.pdf",
  confidence_scores: null,
  error_message: "OCR confidence below threshold",
  progress: 40,
  processed_at: null,
  created_at: "2025-06-16T08:00:00Z",
  updated_at: "2025-06-16T08:01:00Z",
  uploaded_at: "2025-06-16T08:00:00Z",
};

export const mockProcessingInvoice: Invoice = {
  ...mockInvoice,
  id: "inv_006",
  status: "processing",
  processing_stage: "extraction",
  vendor_name: null,
  invoice_number: null,
  invoice_date: null,
  total_amount: null,
  original_filename: "new-delivery.pdf",
  stored_path: "invoices/org_001/inv_006.pdf",
  confidence_scores: null,
  error_message: null,
  progress: 55,
  processed_at: null,
  approved_by: null,
  approved_at: null,
  exported_at: null,
  created_at: "2025-06-17T10:00:00Z",
  updated_at: "2025-06-17T10:01:00Z",
  uploaded_at: "2025-06-17T10:00:00Z",
};

export const mockQueuedInvoice: Invoice = {
  ...mockInvoice,
  id: "inv_007",
  status: "queued",
  processing_stage: null,
  vendor_name: null,
  invoice_number: null,
  invoice_date: null,
  total_amount: null,
  original_filename: "pending-invoice.pdf",
  stored_path: "invoices/org_001/inv_007.pdf",
  confidence_scores: null,
  error_message: null,
  progress: 0,
  processed_at: null,
  approved_by: null,
  approved_at: null,
  exported_at: null,
  created_at: "2025-06-17T10:05:00Z",
  updated_at: "2025-06-17T10:05:00Z",
  uploaded_at: "2025-06-17T10:05:00Z",
};

export const mockEmailInvoice: Invoice = {
  ...mockInvoice,
  id: "inv_004",
  source: "email",
  vendor_name: "Performance Food Group",
  invoice_number: "PFG-55201",
  invoice_date: "2025-06-13",
  total_amount: 890.0,
  original_filename: "pfg-invoice-55201.pdf",
  stored_path: "invoices/org_001/inv_004.pdf",
  uploaded_at: "2025-06-13T11:00:00Z",
  processed_at: "2025-06-13T11:03:00Z",
  created_at: "2025-06-13T11:00:00Z",
  updated_at: "2025-06-13T11:03:00Z",
};

export const mockExportedInvoice: Invoice = {
  ...mockInvoice,
  id: "inv_005",
  status: "exported",
  vendor_name: "Ben E. Keith",
  invoice_number: "BEK-77001",
  invoice_date: "2025-06-12",
  total_amount: 3456.78,
  original_filename: "benekeith-delivery.pdf",
  stored_path: "invoices/org_001/inv_005.pdf",
  approved_by: "user_001",
  approved_at: "2025-06-13T10:00:00Z",
  exported_at: "2025-06-13T10:05:00Z",
  uploaded_at: "2025-06-12T08:00:00Z",
  processed_at: "2025-06-12T08:04:00Z",
  created_at: "2025-06-12T08:00:00Z",
  updated_at: "2025-06-13T10:05:00Z",
};

export const mockLineItems: InvoiceLineItem[] = [
  {
    id: "li_001",
    invoice_id: "inv_001",
    sort_order: 1,
    quantity: 4,
    size: "50 lb",
    unit: "case",
    description: "Choice Beef Tenderloin",
    item_code: "BEEF-001",
    unit_price: 189.99,
    extended_price: 759.96,
    category: "Meat",
    account: 5100,
    sub_account: 10,
    extra: {},
    created_at: "2025-06-15T14:32:00Z",
    updated_at: "2025-06-15T14:32:00Z",
  },
  {
    id: "li_002",
    invoice_id: "inv_001",
    sort_order: 2,
    quantity: 10,
    size: "1 gal",
    unit: "each",
    description: "Heavy Whipping Cream",
    item_code: "DAIRY-042",
    unit_price: 12.50,
    extended_price: 125.0,
    category: "Dairy",
    account: 5100,
    sub_account: 20,
    extra: {},
    created_at: "2025-06-15T14:32:00Z",
    updated_at: "2025-06-15T14:32:00Z",
  },
  {
    id: "li_003",
    invoice_id: "inv_001",
    sort_order: 3,
    quantity: 2,
    size: "25 lb",
    unit: "bag",
    description: "All Purpose Flour",
    item_code: "DRY-018",
    unit_price: 14.80,
    extended_price: 29.60,
    category: "Dry Goods",
    account: 5100,
    sub_account: 30,
    extra: {},
    created_at: "2025-06-15T14:32:00Z",
    updated_at: "2025-06-15T14:32:00Z",
  },
];

export const mockInvoiceWithLineItems: InvoiceWithLineItems = {
  ...mockInvoice,
  line_items: mockLineItems,
};

export const mockEmailInvoiceWithContext: InvoiceWithLineItems = {
  ...mockEmailInvoice,
  line_items: [],
  email_context: {
    from_email: "invoices@pfgroup.com",
    subject: "Invoice PFG-55201 for June delivery",
    received_at: "2025-06-13T11:00:00Z",
  },
};

export const mockInvoicesList: Invoice[] = [
  mockInvoice,
  mockApprovedInvoice,
  mockFailedInvoice,
  mockEmailInvoice,
  mockExportedInvoice,
];

export const mockDashboardStats: DashboardStats = {
  total: 47,
  pending: 12,
  approved: 20,
  failed: 3,
  queued: 2,
  exported: 10,
  processed_today: 5,
  suspected_duplicates: 1,
  email_invoices: 8,
};

export const mockProcessingJob: ProcessingJob = {
  id: "job_001",
  invoice_id: "inv_001",
  attempt: 1,
  status: "completed",
  stage: "extraction",
  started_at: "2025-06-15T14:30:30Z",
  completed_at: "2025-06-15T14:32:00Z",
  error_message: null,
  metadata: {},
  created_at: "2025-06-15T14:30:30Z",
};



