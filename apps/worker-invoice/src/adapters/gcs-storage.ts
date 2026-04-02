/**
 * GCS file storage adapter.
 *
 * Translated from backend/worker-invoice-processor/src/adapters/gcs_storage.py
 * Provides download/upload for PDF files stored in Google Cloud Storage.
 */

import { Storage } from "@google-cloud/storage";

export interface FileStorage {
  download(storedPath: string): Promise<Buffer>;
  upload(path: string, data: Buffer, contentType: string): Promise<string>;
}

export class GcsFileStorage implements FileStorage {
  private readonly bucketName: string;
  private readonly projectId: string | undefined;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private client: Storage | null = null;

  constructor(opts: {
    bucketName: string;
    projectId?: string;
    timeout?: number;
    maxRetries?: number;
  }) {
    this.bucketName = opts.bucketName;
    this.projectId = opts.projectId;
    this.timeout = opts.timeout ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 3;
  }

  private getClient(): Storage {
    if (!this.client) {
      this.client = new Storage({
        projectId: this.projectId,
        retryOptions: { maxRetries: this.maxRetries },
        timeout: this.timeout,
      });
    }
    return this.client;
  }

  async download(storedPath: string): Promise<Buffer> {
    const client = this.getClient();
    const bucket = client.bucket(this.bucketName);
    const file = bucket.file(storedPath);

    const [contents] = await file.download();
    console.info(
      `GCS downloaded ${storedPath} (${contents.byteLength} bytes)`,
    );
    return contents;
  }

  async upload(
    path: string,
    data: Buffer,
    contentType: string,
  ): Promise<string> {
    const client = this.getClient();
    const bucket = client.bucket(this.bucketName);
    const file = bucket.file(path);

    await file.save(data, { contentType });
    console.info(
      `GCS uploaded ${path} (${data.byteLength} bytes, ${contentType})`,
    );
    return path;
  }
}
