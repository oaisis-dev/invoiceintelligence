import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  assertLocationAccess,
  forbiddenResponse,
  requireAuthContext,
} from "@/lib/authz";
import { appendActivityEvent } from "@/lib/activity-events";
import {
  getSubscriptionUsage,
  canUploadInvoices,
} from "@/lib/billing/enforcement";
import { uploadToGcs } from "@/lib/gcp/storage";
import { publishInvoiceProcessing } from "@/lib/gcp/pubsub";

const MAX_FILES = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const DEDUPE_WINDOW_HOURS = 72;
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/tiff",
]);

type UploadResultItem = {
  fileName: string;
  fileId?: string;
  invoiceId?: string;
  status: "queued" | "failed" | "skipped_duplicate";
  duplicateOf?: string;
  duplicateUploadedAt?: string;
  error?: string;
};

export async function POST(request: NextRequest) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  // ---------- Subscription enforcement -----------
  const usage = await getSubscriptionUsage(
    context.supabase,
    context.orgId
  );
  const uploadCheck = canUploadInvoices(usage);
  if (!uploadCheck.allowed) {
    return forbiddenResponse(
      "SUBSCRIPTION_LIMIT_REACHED",
      uploadCheck.reason ?? "Upload limit reached"
    );
  }

  // ---------- Parse multipart form data -----------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart/form-data request" },
      { status: 400 }
    );
  }

  const files = formData.getAll("files");
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files provided" },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Too many files. Maximum is ${MAX_FILES}.` },
      { status: 400 }
    );
  }

  // ---------- Validate all files upfront -----------
  const validFiles: File[] = [];
  for (const entry of files) {
    if (!(entry instanceof File)) {
      return NextResponse.json(
        { error: "Each entry in 'files' must be a file" },
        { status: 400 }
      );
    }

    if (!ACCEPTED_MIME_TYPES.has(entry.type)) {
      return NextResponse.json(
        { error: `File "${entry.name}" is not an accepted type. Accepted: PDF, PNG, JPG, TIFF` },
        { status: 400 }
      );
    }

    if (entry.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File "${entry.name}" exceeds the 10 MB size limit` },
        { status: 400 }
      );
    }

    validFiles.push(entry);
  }

  const requestLocationId = formData.get("location_id");
  const targetLocationId =
    typeof requestLocationId === "string" && requestLocationId.trim()
      ? requestLocationId.trim()
      : context.locationId;

  if (!targetLocationId) {
    return forbiddenResponse(
      "LOCATION_SCOPE_REQUIRED",
      "A location_id is required for invoice uploads."
    );
  }

  const locationError = assertLocationAccess(context, targetLocationId);
  if (locationError) {
    return locationError;
  }

  const fileIds = formData
    .getAll("file_ids")
    .filter((entry): entry is string => typeof entry === "string");
  const dedupeCutoff = new Date(
    Date.now() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  // ---------- Process each file -----------
  const createdIds: string[] = [];
  const results: UploadResultItem[] = [];

  for (const [index, file] of validFiles.entries()) {
    const clientFileId = fileIds[index];

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

    const { data: duplicateRows, error: duplicateLookupError } =
      await context.supabase
        .from("invoices")
        .select("id, uploaded_at")
        .eq("org_id", context.orgId)
        .eq("location_id", targetLocationId)
        .eq("file_hash", fileHash)
        .not("status", "in", "(cancelled,failed)")
        .gte("uploaded_at", dedupeCutoff)
        .order("uploaded_at", { ascending: false })
        .limit(1);

    if (duplicateLookupError) {
      results.push({
        fileName: file.name,
        fileId: clientFileId,
        status: "failed",
        error: `Failed duplicate lookup: ${duplicateLookupError.message}`,
      });
      continue;
    }

    const duplicateOf = duplicateRows?.[0]?.id as string | undefined;
    if (duplicateOf) {
      results.push({
        fileName: file.name,
        fileId: clientFileId,
        status: "skipped_duplicate",
        duplicateOf,
        duplicateUploadedAt: duplicateRows[0]?.uploaded_at,
      });

      await appendActivityEvent({
        eventType: "invoice.upload_skipped_duplicate",
        category: "invoice",
        severity: "info",
        resourceType: "invoice",
        notificationPolicy: "none",
        payload: {
          file_name: file.name,
          duplicate_of: duplicateOf,
          location_id: targetLocationId,
          file_hash: fileHash,
          source: "web_upload",
        },
      });
      continue;
    }

    // 1. Generate UUID upfront (matches email intake pattern)
    const invoiceId = crypto.randomUUID();
    const storedPath = `invoices/${invoiceId}/${file.name}`;

    // 2. Upload PDF to GCS
    try {
      await uploadToGcs(storedPath, fileBuffer, file.type || "application/octet-stream");
    } catch (err) {
      results.push({
        fileName: file.name,
        fileId: clientFileId,
        status: "failed",
        error: `Failed to upload: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    // 3. Insert invoice record with pre-generated UUID
    const { error: insertError } = await context.supabase
      .from("invoices")
      .insert({
        id: invoiceId,
        org_id: context.orgId,
        location_id: targetLocationId,
        status: "queued",
        source: "web_upload",
        original_filename: file.name,
        stored_path: storedPath,
        uploaded_by: context.appUserId,
        file_hash: fileHash,
        metadata: {},
        progress: 0,
      });

    if (insertError) {
      results.push({
        fileName: file.name,
        fileId: clientFileId,
        status: "failed",
        error: `Failed to create invoice: ${insertError.message}`,
      });
      continue;
    }

    // 4. Create processing_jobs record
    const { error: jobError } = await context.supabase
      .from("processing_jobs")
      .insert({
      invoice_id: invoiceId,
      attempt: 1,
      status: "pending",
      metadata: {},
      });

    if (jobError) {
      await context.supabase
        .from("invoices")
        .update({ status: "uploaded", error_message: `Failed to queue job: ${jobError.message}` })
        .eq("id", invoiceId);
      results.push({
        fileName: file.name,
        fileId: clientFileId,
        invoiceId,
        status: "failed",
        error: `Failed to create processing job: ${jobError.message}`,
      });
      continue;
    }

    // 5. Publish to Pub/Sub so worker picks it up
    try {
      await publishInvoiceProcessing({
        invoice_id: invoiceId,
        org_id: context.orgId,
        attempt: 1,
        source: "web_upload",
      });
    } catch (err) {
      // Revert status so UI shows it wasn't queued
      await context.supabase
        .from("invoices")
        .update({ status: "uploaded" })
        .eq("id", invoiceId);
      results.push({
        fileName: file.name,
        fileId: clientFileId,
        invoiceId,
        status: "failed",
        error: `Failed to publish processing event: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    createdIds.push(invoiceId);
    results.push({
      fileName: file.name,
      fileId: clientFileId,
      invoiceId,
      status: "queued",
    });
  }

  const skippedCount = results.filter(
    (result) => result.status === "skipped_duplicate"
  ).length;
  const failedCount = results.filter(
    (result) => result.status === "failed"
  ).length;

  if (createdIds.length === 0 && skippedCount === 0) {
    return NextResponse.json(
      { error: "All uploads failed", results },
      { status: 500 }
    );
  }

  if (createdIds.length > 0) {
    await appendActivityEvent({
      eventType: "invoice.upload_batch_started",
      category: "invoice",
      severity: "info",
      notificationPolicy: "actor_only",
      payload: {
        count: createdIds.length,
        source: "web_upload",
      },
    });

    revalidatePath("/invoices");
    revalidatePath("/");
  }

  const responseStatus = createdIds.length > 0 ? 201 : 200;

  return NextResponse.json(
    {
      uploaded: createdIds.length,
      skipped_duplicates: skippedCount,
      failed: failedCount,
      invoiceIds: createdIds,
      results,
    },
    { status: responseStatus }
  );
}
