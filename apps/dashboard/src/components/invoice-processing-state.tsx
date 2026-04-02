"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, Check, Loader2, Circle } from "lucide-react";
import { translateError } from "@/lib/translate-error";
import { TechnicalDetails } from "@/components/ui/technical-details";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardContent,
} from "@/components/ui/glass-card";
import {
  PROCESSING_STAGES,
  stageLabels,
  stageDescriptions,
  resolveStatusProgress,
} from "@/lib/invoice-status";
import type { InvoiceStatus, ProcessingStage } from "@/types/database";

interface InvoiceProcessingStateProps {
  status: InvoiceStatus;
  progress: number;
  processingStage: ProcessingStage | null;
  errorMessage: string | null;
  uploadedAt: string;
}

type StageState = "completed" | "active" | "failed" | "pending";

function getStageState(
  stage: ProcessingStage,
  currentStage: ProcessingStage | null,
  status: InvoiceStatus
): StageState {
  if (status === "queued" || status === "uploaded") return "pending";

  if (!currentStage) return "pending";

  const stageIndex = PROCESSING_STAGES.indexOf(stage);
  const currentIndex = PROCESSING_STAGES.indexOf(currentStage);

  if (stageIndex < currentIndex) return "completed";
  if (stageIndex === currentIndex) {
    return status === "failed" ? "failed" : "active";
  }
  return "pending";
}

function StageIcon({ state }: { state: StageState }) {
  if (state === "completed") {
    return (
      <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <Check className="size-3.5" />
      </div>
    );
  }
  if (state === "failed") {
    return (
      <div className="flex size-6 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle className="size-3.5" />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="flex size-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <Loader2 className="size-3.5 animate-spin" />
      </div>
    );
  }
  return (
    <div className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Circle className="size-3" />
    </div>
  );
}

function formatElapsed(since: string): string {
  const start = new Date(since).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - start) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins}m ${secs}s ago`;
}

function ElapsedTime({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(since));

  useEffect(() => {
    const id = setInterval(() => setElapsed(formatElapsed(since)), 1_000);
    return () => clearInterval(id);
  }, [since]);

  return (
    <span className="text-xs text-muted-foreground">
      Uploaded {elapsed}
    </span>
  );
}

export function InvoiceProcessingState({
  status,
  progress,
  processingStage,
  errorMessage,
  uploadedAt,
}: InvoiceProcessingStateProps) {
  const isFailed = status === "failed";
  const resolvedProgress = resolveStatusProgress(status, progress, processingStage);
  const translatedError = useMemo(
    () => (isFailed && errorMessage ? translateError(errorMessage) : null),
    [isFailed, errorMessage]
  );

  const activeDescription = isFailed
    ? "Processing failed"
    : processingStage
      ? stageDescriptions[processingStage]
      : status === "queued"
        ? "Waiting in queue for processing to begin..."
        : "Preparing invoice for processing...";

  return (
    <GlassCard>
      <GlassCardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            {isFailed ? "Processing Failed" : "Processing Invoice"}
          </h3>
          <ElapsedTime since={uploadedAt} />
        </div>
      </GlassCardHeader>
      <GlassCardContent>
        <div className="flex flex-col gap-6">
          {/* Progress bar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className={isFailed ? "text-red-600" : "text-muted-foreground"}>
                {activeDescription}
              </span>
              <span className="font-medium tabular-nums">
                {resolvedProgress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full rounded-full ${isFailed ? "bg-red-500" : "bg-blue-500"}`}
                initial={{ width: 0 }}
                animate={{ width: `${resolvedProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Error message */}
          {translatedError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <p className="font-medium">{translatedError.userMessage}</p>
              <p className="mt-1 text-xs text-red-600">{translatedError.action}</p>
              <TechnicalDetails detail={translatedError.technicalDetail} />
            </div>
          )}

          {/* Stage stepper */}
          <div className="flex flex-col gap-0">
            {PROCESSING_STAGES.map((stage, idx) => {
              const state = getStageState(stage, processingStage, status);
              const isLast = idx === PROCESSING_STAGES.length - 1;

              return (
                <div key={stage} className="flex gap-3">
                  {/* Icon + connector line */}
                  <div className="flex flex-col items-center">
                    <StageIcon state={state} />
                    {!isLast && (
                      <div
                        className={`w-px flex-1 min-h-4 ${
                          state === "completed"
                            ? "bg-emerald-300"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pb-4">
                    <p
                      className={`text-sm leading-6 ${
                        state === "failed"
                          ? "font-medium text-red-600"
                          : state === "active"
                            ? "font-medium text-foreground"
                            : state === "completed"
                              ? "text-muted-foreground"
                              : "text-muted-foreground/60"
                      }`}
                    >
                      {stageLabels[stage]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}
