/**
 * HTTP client for the external OCR microservice.
 *
 * Communicates with a separate OCR service via HTTP.
 * Methods mirror the capabilities the pipeline needs:
 * PDF rotation, invoice extraction, and line-item classification.
 */

export interface OcrServiceClient {
  rotatePdf(pdfBytes: Buffer): Promise<Buffer>;
  extractInvoice(pdfBytes: Buffer): Promise<OcrExtractionResult>;
  classifyLineItems(
    lineItems: LineItemInput[],
  ): Promise<ClassificationResult[]>;
}

export interface OcrExtractionResult {
  rawText: string;
  pageCount: number;
  confidence: number;
  pageTexts: string[];
  pageConfidences: number[];
}

export interface LineItemInput {
  description: string;
  amount: number;
}

export interface ClassificationResult {
  category: string;
  confidence: number;
}

export class HttpOcrServiceClient implements OcrServiceClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(opts: { baseUrl: string; timeoutMs?: number }) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.timeoutMs = opts.timeoutMs ?? 120_000;
  }

  private async post(
    path: string,
    body: Buffer | string,
    contentType: string,
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `OCR service ${path} failed: ${response.status} ${response.statusText}`,
      );
    }

    return response;
  }

  async rotatePdf(pdfBytes: Buffer): Promise<Buffer> {
    const response = await this.post("/rotate-pdf", pdfBytes, "application/pdf");
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async extractInvoice(pdfBytes: Buffer): Promise<OcrExtractionResult> {
    const response = await this.post("/extract-invoice", pdfBytes, "application/pdf");
    return (await response.json()) as OcrExtractionResult;
  }

  async classifyLineItems(
    lineItems: LineItemInput[],
  ): Promise<ClassificationResult[]> {
    const response = await this.post(
      "/classify-line-items",
      JSON.stringify({ line_items: lineItems }),
      "application/json",
    );
    return (await response.json()) as ClassificationResult[];
  }
}
