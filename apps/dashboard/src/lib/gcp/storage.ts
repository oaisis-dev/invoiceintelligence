import "server-only";

import { Storage, type Bucket } from "@google-cloud/storage";

let _bucket: Bucket | null = null;

function getBucket(): Bucket {
  if (!_bucket) {
    const projectId = process.env.GCP_PROJECT_ID;
    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!projectId) throw new Error("GCP_PROJECT_ID env var is required");
    if (!bucketName) throw new Error("GCS_BUCKET_NAME env var is required");
    _bucket = new Storage({ projectId }).bucket(bucketName);
  }
  return _bucket;
}

/**
 * Upload a file to GCS.
 */
export async function uploadToGcs(
  storedPath: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  const file = getBucket().file(storedPath);
  await file.save(data, { contentType, resumable: false });
}

/**
 * Download a file from GCS as a Buffer.
 */
export async function downloadFromGcs(storedPath: string): Promise<Buffer> {
  const file = getBucket().file(storedPath);
  const [contents] = await file.download();
  return contents;
}

/**
 * Delete a file from GCS. Silently succeeds if the file does not exist.
 */
export async function deleteFromGcs(storedPath: string): Promise<void> {
  const file = getBucket().file(storedPath);
  await file.delete({ ignoreNotFound: true });
}
