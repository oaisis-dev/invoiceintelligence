"use client";

import { FileText } from "lucide-react";
import { PdfViewer } from "@/components/pdf-viewer";
import { ImageViewer } from "@/components/image-viewer";
import type { DocumentKind } from "@/lib/document-kind";

interface DocumentViewerProps {
  documentUrl: string | null;
  documentKind: DocumentKind;
}

function UnsupportedDocumentPlaceholder() {
  return (
    <div className="flex aspect-[8.5/11] w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <FileText className="size-12 opacity-40" aria-hidden="true" />
        <p className="text-sm font-medium">No document preview available</p>
        <p className="text-xs">This file type is not supported for in-app preview.</p>
      </div>
    </div>
  );
}

export function DocumentViewer({ documentUrl, documentKind }: DocumentViewerProps) {
  if (!documentUrl || documentKind === "unknown") {
    return <UnsupportedDocumentPlaceholder />;
  }

  if (documentKind === "image") {
    return <ImageViewer fileUrl={documentUrl} />;
  }

  return <PdfViewer fileUrl={documentUrl} />;
}
