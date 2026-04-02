"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TechnicalDetailsProps {
  detail: string;
  className?: string;
}

export function TechnicalDetails({ detail, className }: TechnicalDetailsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("mt-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <ChevronDown className="size-3" aria-hidden="true" />
        </motion.span>
        Technical details
      </button>

      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-1 overflow-hidden whitespace-pre-wrap break-all rounded bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground"
          >
            {detail}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}
