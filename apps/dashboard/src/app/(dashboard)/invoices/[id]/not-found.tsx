import Link from "next/link";
import { FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InvoiceNotFound() {
  return (
    <div className="flex min-h-[400px] items-center justify-center px-4">
      <div className="flex max-w-md flex-col items-center rounded-2xl bg-white/70 border border-white/20 px-8 py-10 text-center shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]">
        <div
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted"
          aria-hidden="true"
        >
          <FileX className="size-6 text-muted-foreground" />
        </div>
        <h2 className="text-base font-semibold text-foreground">
          Invoice Not Found
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The invoice you are looking for does not exist or has been removed.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="default" size="sm" asChild>
            <Link href="/invoices">Back to Invoices</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
