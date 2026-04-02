/**
 * Pipeline builder — wires all repos, adapters, and pipeline steps.
 *
 * Translated from _build_pipeline() in backend/worker-invoice-processor/src/main.py
 *
 * The actual step implementations and InvoicePipeline orchestrator will come
 * from @invoiceprocessor/invoice once that package is created. For now we
 * define local stub interfaces so the wiring compiles.
 */

import type { WorkerConfig } from "./config.js";
import { GcsFileStorage } from "./adapters/gcs-storage.js";
import { HttpOcrServiceClient } from "./adapters/ocr-service-client.js";
import type { NotificationPublisher } from "./adapters/pubsub-publisher.js";
import { PubSubNotificationPublisher } from "./adapters/pubsub-publisher.js";

// Stub types — will be replaced by @invoiceprocessor/invoice imports
/** A single step in the invoice processing pipeline. */
export interface PipelineStep {
  name: string;
  execute(context: PipelineContext): Promise<PipelineContext>;
}

/** Context threaded through every pipeline step. */
export interface PipelineContext {
  invoiceId: string;
  orgId: string;
  attempt: number;
  [key: string]: unknown;
}

/** Orchestrates execution of pipeline steps in sequence. */
export class InvoicePipeline {
  constructor(
    private readonly steps: PipelineStep[],
    private readonly config: {
      stepTimeout: number;
      staleLockMinutes: number;
    },
  ) {}

  async process(
    invoiceId: string,
    orgId: string,
    attempt: number,
  ): Promise<void> {
    let context: PipelineContext = { invoiceId, orgId, attempt };

    for (const step of this.steps) {
      console.info(`Running step: ${step.name}`);
      context = await step.execute(context);
    }

    console.info(
      `Pipeline complete for invoice ${invoiceId} (${this.steps.length} steps)`,
    );
  }
}


function stubStep(name: string): PipelineStep {
  return {
    name,
    async execute(context: PipelineContext) {
      console.info(`[stub] ${name} — no-op`);
      return context;
    },
  };
}


export interface PipelineDeps {
  pipeline: InvoicePipeline;
  storage: GcsFileStorage;
  ocrClient: HttpOcrServiceClient;
  notificationPublisher: NotificationPublisher;
}

export function buildPipeline(config: WorkerConfig): PipelineDeps {
  const storage = new GcsFileStorage({
    bucketName: config.gcsBucketName,
    projectId: config.gcpProjectId,
    timeout: config.timeoutGcs * 1000,
    maxRetries: config.adapterMaxRetries,
  });

  const ocrClient = new HttpOcrServiceClient({
    baseUrl: config.ocrServiceUrl,
    timeoutMs: config.timeoutVisionOcr * 1000,
  });

  const notificationPublisher = new PubSubNotificationPublisher(
    config.gcpProjectId,
  );

  const steps: PipelineStep[] = [
    stubStep("RotatePdf"),
    stubStep("SmartExtract"),
    stubStep("VerifyDocument"),
    stubStep("DuplicateCheck"),
    stubStep("Validate"),
    stubStep("Classify"),
    stubStep("Normalize"),
  ];

  const pipeline = new InvoicePipeline(steps, {
    stepTimeout: config.timeoutStep,
    staleLockMinutes: config.staleLockMinutes,
  });

  return { pipeline, storage, ocrClient, notificationPublisher };
}
