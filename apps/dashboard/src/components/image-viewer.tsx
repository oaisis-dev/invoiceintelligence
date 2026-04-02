"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageViewerProps {
  fileUrl: string | null;
  className?: string;
}

export function ImageViewer({ fileUrl, className }: ImageViewerProps) {
  const [hasError, setHasError] = useState(false);

  if (!fileUrl) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex aspect-[8.5/11] w-full items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="size-12 opacity-40" aria-hidden="true" />
            <p className="text-sm font-medium">No image available</p>
            <p className="text-xs">The original document image is not available.</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn("flex flex-col gap-4", className)}>
        <div className="flex aspect-[8.5/11] w-full items-center justify-center rounded-lg border border-dashed border-destructive/25 bg-destructive/5">
          <div className="flex flex-col items-center gap-2 text-destructive">
            <ImageIcon className="size-12 opacity-40" aria-hidden="true" />
            <p className="text-sm font-medium">Failed to load image</p>
            <p className="text-xs text-muted-foreground">
              The document image could not be loaded. It may be missing or corrupted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative overflow-auto rounded-lg border border-border bg-white p-2">
        <Image
          src={fileUrl}
          alt="Original invoice document"
          width={1200}
          height={1600}
          unoptimized
          className="h-auto max-h-[80vh] w-full object-contain"
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
}
