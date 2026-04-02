import { NextRequest, NextResponse } from "next/server";
import { downloadFromGcs } from "@/lib/gcp/storage";
import { assertLocationAccess, requireAuthContext } from "@/lib/authz";
import { getDocumentContentType } from "@/lib/document-kind";
import { convertTiffToPng } from "@/lib/image-preview";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuthContext();
  if (authResult.error) {
    return authResult.error;
  }
  const { context } = authResult;

  const { id } = await params;

  const { data: invoice, error } = await context.supabase
    .from("invoices")
    .select("stored_path, original_filename, location_id")
    .eq("id", id)
    .single();

  if (error || !invoice?.stored_path) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const locationError = assertLocationAccess(
    context,
    (invoice.location_id as string | null) ?? null
  );
  if (locationError) {
    return locationError;
  }

  const contentType = getDocumentContentType({
    storedPath: invoice.stored_path,
    originalFilename: invoice.original_filename as string | null | undefined,
  });
  const isAbsolutePath = /^https?:\/\//i.test(invoice.stored_path);

  // For browser-native formats, preserve direct redirect behavior when the path is already absolute.
  // TIFF is special-cased below for conversion because many browsers cannot render it directly.
  if (isAbsolutePath && contentType !== "image/tiff") {
    return NextResponse.redirect(invoice.stored_path, 307);
  }

  try {
    let fileBuffer: Buffer;
    if (isAbsolutePath) {
      const upstream = await fetch(invoice.stored_path);
      if (!upstream.ok) {
        throw new Error(
          `Failed to retrieve absolute document URL: ${upstream.status} ${upstream.statusText}`
        );
      }
      const bytes = await upstream.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
    } else {
      fileBuffer = await downloadFromGcs(invoice.stored_path);
    }

    let responseBuffer = fileBuffer;
    let responseContentType = contentType;

    if (contentType === "image/tiff") {
      try {
        responseBuffer = await convertTiffToPng(fileBuffer);
        responseContentType = "image/png";
      } catch (conversionErr) {
        console.error(
          "TIFF preview conversion failed for invoice %s; serving original TIFF:",
          id,
          conversionErr
        );
      }
    }

    return new Response(new Uint8Array(responseBuffer), {
      headers: {
        "Content-Type": responseContentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Document download failed for invoice %s:", id, err);
    const message =
      err instanceof Error ? err.message : "Failed to retrieve document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
