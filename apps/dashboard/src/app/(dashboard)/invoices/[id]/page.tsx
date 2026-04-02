import { notFound } from "next/navigation";
import { getInvoiceById, getOrgConfigVersion } from "@/lib/queries/invoices";
import { StaleConfigBanner } from "@/components/stale-config-banner";
import { InvoiceSpreadsheetView } from "@/components/invoice-spreadsheet-view";

export default async function InvoiceReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Guard against non-UUID paths (e.g. pdf.worker.mjs) hitting this route
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    notFound();
  }

  const [invoice, orgConfigVersion] = await Promise.all([
    getInvoiceById(id),
    getOrgConfigVersion(),
  ]);

  if (!invoice) {
    notFound();
  }

  const isStaleConfig =
    invoice.normalization_status === "completed" &&
    invoice.normalized_with_config_version != null &&
    invoice.normalized_with_config_version < orgConfigVersion;

  const documentUrl = invoice.stored_path ? `/api/invoices/${id}/pdf` : null;

  return (
    <>
      <StaleConfigBanner invoiceId={invoice.id} show={isStaleConfig} />
      <InvoiceSpreadsheetView
        key={`${invoice.id}:${invoice.updated_at}`}
        invoice={invoice}
        documentUrl={documentUrl}
      />
    </>
  );
}
