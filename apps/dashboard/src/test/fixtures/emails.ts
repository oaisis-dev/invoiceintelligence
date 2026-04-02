import type {
  EmailIngestion,
  EmailAttachment,
  EmailAttachmentWithInvoice,
  EmailIngestionWithAttachments,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Shared test fixtures for email ingestion data.
// All fields match the types in src/types/database.ts.
// ---------------------------------------------------------------------------

export const mockEmailAttachment: EmailAttachment = {
  id: "ea_001",
  email_ingestion_id: "ei_001",
  invoice_id: "inv_004",
  filename: "pfg-invoice-55201.pdf",
  status: "queued",
  stored_path: "emails/org_001/ea_001.pdf",
  error_message: null,
  created_at: "2025-06-13T11:00:00Z",
  updated_at: "2025-06-13T11:00:00Z",
};

export const mockSkippedAttachment: EmailAttachment = {
  id: "ea_002",
  email_ingestion_id: "ei_001",
  invoice_id: null,
  filename: "logo.png",
  status: "skipped",
  stored_path: null,
  error_message: "Not a PDF file",
  created_at: "2025-06-13T11:00:00Z",
  updated_at: "2025-06-13T11:00:00Z",
};

export const mockAttachmentWithInvoice: EmailAttachmentWithInvoice = {
  ...mockEmailAttachment,
  invoice: {
    id: "inv_004",
    status: "ready_for_review",
    vendor_name: "Performance Food Group",
  },
};

export const mockSkippedAttachmentWithInvoice: EmailAttachmentWithInvoice = {
  ...mockSkippedAttachment,
  invoice: null,
};

export const mockEmailIngestion: EmailIngestion = {
  id: "ei_001",
  org_id: "org_001",
  message_id: "<msg-001@mail.pfgroup.com>",
  from_email: "invoices@pfgroup.com",
  subject: "Invoice PFG-55201 for June delivery",
  status: "completed",
  mark_read_status: "completed",
  mark_read_error: null,
  marked_read_at: "2025-06-13T11:03:00Z",
  attachment_count: 2,
  error_message: null,
  received_at: "2025-06-13T11:00:00Z",
  processed_at: "2025-06-13T11:03:00Z",
  created_at: "2025-06-13T11:00:00Z",
  updated_at: "2025-06-13T11:03:00Z",
};

export const mockFailedEmailIngestion: EmailIngestion = {
  id: "ei_002",
  org_id: "org_001",
  message_id: "<msg-002@unknown.com>",
  from_email: "spam@unknown.com",
  subject: "You won a prize!",
  status: "failed",
  mark_read_status: "failed",
  mark_read_error: "Sender not in approved list",
  marked_read_at: null,
  attachment_count: 0,
  error_message: "Sender not in approved list",
  received_at: "2025-06-14T02:00:00Z",
  processed_at: "2025-06-14T02:00:05Z",
  created_at: "2025-06-14T02:00:00Z",
  updated_at: "2025-06-14T02:00:05Z",
};

export const mockProcessingEmailIngestion: EmailIngestion = {
  id: "ei_003",
  org_id: "org_001",
  message_id: "<msg-003@sysco.com>",
  from_email: "invoices@sysco.com",
  subject: "Weekly invoice batch - Sysco",
  status: "processing",
  mark_read_status: "pending",
  mark_read_error: null,
  marked_read_at: null,
  attachment_count: 3,
  error_message: null,
  received_at: "2025-06-16T09:00:00Z",
  processed_at: null,
  created_at: "2025-06-16T09:00:00Z",
  updated_at: "2025-06-16T09:00:00Z",
};

export const mockEmailIngestionWithAttachments: EmailIngestionWithAttachments = {
  ...mockEmailIngestion,
  email_attachments: [mockAttachmentWithInvoice, mockSkippedAttachmentWithInvoice],
};

export const mockFailedEmailIngestionWithAttachments: EmailIngestionWithAttachments = {
  ...mockFailedEmailIngestion,
  email_attachments: [],
};

export const mockEmailIngestionsList: EmailIngestionWithAttachments[] = [
  mockEmailIngestionWithAttachments,
  mockFailedEmailIngestionWithAttachments,
  {
    ...mockProcessingEmailIngestion,
    email_attachments: [
      {
        id: "ea_003",
        email_ingestion_id: "ei_003",
        invoice_id: null,
        filename: "sysco-inv-batch-a.pdf",
        status: "pending",
        stored_path: "emails/org_001/ea_003.pdf",
        error_message: null,
        created_at: "2025-06-16T09:00:00Z",
        updated_at: "2025-06-16T09:00:00Z",
        invoice: null,
      },
      {
        id: "ea_004",
        email_ingestion_id: "ei_003",
        invoice_id: null,
        filename: "sysco-inv-batch-b.pdf",
        status: "pending",
        stored_path: "emails/org_001/ea_004.pdf",
        error_message: null,
        created_at: "2025-06-16T09:00:00Z",
        updated_at: "2025-06-16T09:00:00Z",
        invoice: null,
      },
      {
        id: "ea_005",
        email_ingestion_id: "ei_003",
        invoice_id: null,
        filename: "sysco-inv-batch-c.pdf",
        status: "pending",
        stored_path: "emails/org_001/ea_005.pdf",
        error_message: null,
        created_at: "2025-06-16T09:00:00Z",
        updated_at: "2025-06-16T09:00:00Z",
        invoice: null,
      },
    ],
  },
];
