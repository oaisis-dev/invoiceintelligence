"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Dynamic imports with SSR disabled — required for react-pdf.
// No per-component loading fallbacks here; we use a single overlay approach instead.
const Document = dynamic(
  () =>
    import("react-pdf").then((m) => {
      m.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      return { default: m.Document };
    }),
  { ssr: false }
);

const Page = dynamic(
  () => import("react-pdf").then((m) => m.Page),
  { ssr: false }
);

interface PdfViewerProps {
  fileUrl: string | null;
  className?: string;
}

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

function PdfPlaceholder() {
  return (
    <div className="flex aspect-[8.5/11] w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <FileText className="size-12 opacity-40" aria-hidden="true" />
        <p className="text-sm font-medium">No PDF available</p>
        <p className="text-xs">The original document has not been uploaded yet.</p>
      </div>
    </div>
  );
}

export function PdfViewer({ fileUrl, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasError, setHasError] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  // Single loading flag — stays false until a <canvas> is actually painted in the container.
  const [isReady, setIsReady] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width for responsive rendering
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Watch for the <canvas> element that react-pdf injects when the page is rendered.
  // This is more reliable than onRenderSuccess through the next/dynamic wrapper.
  useEffect(() => {
    if (isReady || !containerRef.current) return;

    const el = containerRef.current;

    // If canvas already exists (e.g. fast cache hit), mark ready on next frame
    // to avoid synchronous setState inside an effect body (react-hooks/set-state-in-effect).
    if (el.querySelector("canvas")) {
      const raf = requestAnimationFrame(() => setIsReady(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new MutationObserver(() => {
      if (el.querySelector("canvas")) {
        setIsReady(true);
        observer.disconnect();
      }
    });

    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isReady]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages: total }: { numPages: number }) => {
      setNumPages(total);
      setCurrentPage(1);
      setHasError(false);
    },
    []
  );

  const onDocumentLoadError = useCallback(() => {
    setHasError(true);
  }, []);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(numPages, prev + 1));
  }, [numPages]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(ZOOM_MAX, prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(ZOOM_MIN, prev - ZOOM_STEP));
  }, []);

  if (!fileUrl) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <PdfPlaceholder />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {hasError ? (
        <div className="flex aspect-[8.5/11] w-full items-center justify-center rounded-lg border border-dashed border-destructive/25 bg-destructive/5">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <FileText className="size-12 opacity-40" aria-hidden="true" />
            <p className="text-sm font-medium">Failed to load PDF</p>
            <p className="text-xs text-muted-foreground">
              The document could not be loaded. It may be corrupted or inaccessible.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="relative overflow-auto rounded-lg border border-border bg-white"
          >
            {/* Loading overlay — sits on the white card until the page renders */}
            {!isReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
                  <p className="text-sm font-medium text-muted-foreground/60">
                    Loading PDF...
                  </p>
                </div>
              </div>
            )}

            {/* Invisible until ready — react-pdf renders underneath the overlay */}
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="flex justify-center"
            >
              {containerWidth > 0 && (
                <Page
                  pageNumber={currentPage}
                  width={containerWidth * zoom}
                  rotate={rotation}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              )}
            </Document>

            {/* Give the container a minimum height while loading so the overlay is visible */}
            {!isReady && <div className="aspect-[8.5/11] w-full" />}
          </div>

          {/* Controls toolbar */}
          {numPages > 0 && (
            <div className="flex items-center justify-center gap-1">
              {/* Page navigation */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[5.5rem] text-center text-sm text-muted-foreground tabular-nums">
                Page {currentPage} of {numPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>

              {/* Divider */}
              <div className="mx-2 h-5 w-px bg-border" />

              {/* Zoom controls */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleZoomOut}
                disabled={zoom <= ZOOM_MIN}
                aria-label="Zoom out"
              >
                <ZoomOut className="size-4" />
              </Button>
              <span className="min-w-[3rem] text-center text-sm text-muted-foreground tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleZoomIn}
                disabled={zoom >= ZOOM_MAX}
                aria-label="Zoom in"
              >
                <ZoomIn className="size-4" />
              </Button>

              {/* Divider */}
              <div className="mx-2 h-5 w-px bg-border" />

              {/* Rotate */}
              <Button
                variant="outline"
                size="icon-sm"
                onClick={handleRotate}
                aria-label="Rotate 90 degrees"
              >
                <RotateCw className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
