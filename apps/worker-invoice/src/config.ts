/**
 * Worker configuration loaded from environment variables.
 *
 * Translated from backend/worker-invoice-processor/src/config.py
 */

export interface WorkerConfig {
  // Supabase
  supabaseUrl: string;
  supabaseSecretKey: string;

  // Google Cloud
  gcpProjectId: string;
  gcsBucketName: string;
  pubsubTopic: string;
  geminiApiKey: string;
  geminiModel: string;
  geminiModelFallback: string;

  // Smart extraction quality threshold (0-100)
  extractionQualityThreshold: number;

  // Worker config
  invoiceTestMode: boolean;
  logLevel: string;

  // Resilience: adapter retry
  adapterMaxRetries: number;
  adapterRetryMinWait: number;
  adapterRetryMaxWait: number;

  // Resilience: per-call timeouts (seconds)
  timeoutGemini: number;
  timeoutVisionOcr: number;
  timeoutGcs: number;
  timeoutSupabase: number;

  // Resilience: per-step timeout (seconds)
  timeoutStep: number;

  // Resilience: pipeline limits
  staleLockMinutes: number;

  // OCR service URL (external microservice)
  ocrServiceUrl: string;
}

function envStr(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export function getConfig(): WorkerConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
  if (!supabaseSecretKey) throw new Error("SUPABASE_SECRET_KEY is required");

  return {
    supabaseUrl,
    supabaseSecretKey,

    gcpProjectId: envStr("GCP_PROJECT_ID", ""),
    gcsBucketName: envStr("GCS_BUCKET_NAME", ""),
    pubsubTopic: envStr("PUBSUB_TOPIC", "invoice-processing"),
    geminiApiKey: envStr("GEMINI_API_KEY", ""),
    geminiModel: envStr("GEMINI_MODEL", "gemini-2.5-flash"),
    geminiModelFallback: envStr("GEMINI_MODEL_FALLBACK", "gemini-2.5-pro"),

    extractionQualityThreshold: envInt("EXTRACTION_QUALITY_THRESHOLD", 70),

    invoiceTestMode: envBool("INVOICE_TEST_MODE", false),
    logLevel: envStr("LOG_LEVEL", "INFO"),

    adapterMaxRetries: envInt("ADAPTER_MAX_RETRIES", 3),
    adapterRetryMinWait: envFloat("ADAPTER_RETRY_MIN_WAIT", 1.0),
    adapterRetryMaxWait: envFloat("ADAPTER_RETRY_MAX_WAIT", 10.0),

    timeoutGemini: envFloat("TIMEOUT_GEMINI", 90.0),
    timeoutVisionOcr: envFloat("TIMEOUT_VISION_OCR", 120.0),
    timeoutGcs: envFloat("TIMEOUT_GCS", 30.0),
    timeoutSupabase: envFloat("TIMEOUT_SUPABASE", 30.0),

    timeoutStep: envFloat("TIMEOUT_STEP", 300.0),

    staleLockMinutes: envInt("STALE_LOCK_MINUTES", 15),

    ocrServiceUrl: envStr("OCR_SERVICE_URL", ""),
  };
}
