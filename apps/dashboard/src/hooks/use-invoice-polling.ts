"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getInvoiceStatus, type InvoiceStatusPayload } from "@/lib/api-client";
import { isTerminalStatus } from "@/lib/invoice-status";
import type { InvoiceStatus, ProcessingStage } from "@/types/database";

const POLL_INTERVAL_MS = 3_000;

export type PollingState = {
  status: InvoiceStatus;
  progress: number;
  processingStage: ProcessingStage | null;
  errorMessage: string | null;
};

/**
 * Poll a single invoice's status endpoint while it's in a non-terminal state.
 *
 * Calls `GET /api/invoices/[id]/status` every 3 seconds. Stops automatically
 * when the status transitions to a terminal state and fires `onComplete`.
 */
export function useInvoicePolling(
  invoiceId: string,
  initialStatus: InvoiceStatus,
  initialProgress: number,
  initialStage: ProcessingStage | null,
  initialErrorMessage: string | null,
  onComplete: () => void
) {
  const [state, setState] = useState<PollingState>({
    status: initialStatus,
    progress: initialProgress,
    processingStage: initialStage,
    errorMessage: initialErrorMessage,
  });

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const shouldPoll = !isTerminalStatus(state.status);

  const poll = useCallback(async () => {
    try {
      const data: InvoiceStatusPayload = await getInvoiceStatus(invoiceId);
      setState({
        status: data.status,
        progress: data.progress ?? 0,
        processingStage: data.processing_stage,
        errorMessage: data.error_message,
      });

      if (isTerminalStatus(data.status)) {
        onCompleteRef.current();
      }
    } catch {
      // Silently ignore poll errors — next poll will retry.
    }
  }, [invoiceId]);

  useEffect(() => {
    if (!shouldPoll) return;

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [shouldPoll, poll]);

  return state;
}
