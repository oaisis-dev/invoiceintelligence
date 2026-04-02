"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { translateValidationErrors } from "@/lib/translate-error";

export interface ValidationErrorsBannerProps {
  errorMessage: string;
  className?: string;
}

export function ValidationErrorsBanner({
  errorMessage,
  className,
}: ValidationErrorsBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const translatedErrors = useMemo(
    () => translateValidationErrors(errorMessage),
    [errorMessage]
  );

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-start gap-2 text-left"
      >
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-red-600"
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className="font-medium">
            Processing completed with {translatedErrors.length}{" "}
            {translatedErrors.length === 1 ? "issue" : "issues"}
          </p>
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="mt-0.5 shrink-0"
        >
          <ChevronDown className="size-4 text-red-500" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-2 space-y-1 overflow-hidden pl-6 text-xs text-red-700"
          >
            {translatedErrors.map((err, idx) => (
              <li key={idx} className="flex flex-col gap-0.5">
                <div className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-red-400" />
                  <span>{err.userMessage}</span>
                </div>
                <p className="pl-2.5 text-[11px] text-red-500">{err.action}</p>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
