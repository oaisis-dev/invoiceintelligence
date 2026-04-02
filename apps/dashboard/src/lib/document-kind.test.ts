import { describe, expect, it } from "vitest";
import { getDocumentContentType, getDocumentKind } from "./document-kind";

describe("getDocumentKind", () => {
  it("detects PDF extension", () => {
    expect(getDocumentKind({ storedPath: "invoices/inv/file.PDF" })).toBe("pdf");
  });

  it("detects image extensions", () => {
    expect(getDocumentKind({ originalFilename: "receipt.jpg" })).toBe("image");
    expect(getDocumentKind({ originalFilename: "receipt.jpeg" })).toBe("image");
    expect(getDocumentKind({ originalFilename: "receipt.png" })).toBe("image");
    expect(getDocumentKind({ originalFilename: "receipt.tif" })).toBe("image");
    expect(getDocumentKind({ originalFilename: "receipt.tiff" })).toBe("image");
  });

  it("returns unknown when extension is missing/unsupported", () => {
    expect(getDocumentKind({ storedPath: "invoices/inv/file" })).toBe("unknown");
    expect(getDocumentKind({ storedPath: "invoices/inv/file.heic" })).toBe("unknown");
    expect(getDocumentKind({})).toBe("unknown");
  });

  it("ignores query/hash fragments", () => {
    expect(
      getDocumentKind({ storedPath: "invoices/inv/file.png?signature=abc#hash" })
    ).toBe("image");
  });
});

describe("getDocumentContentType", () => {
  it("maps to application/pdf", () => {
    expect(getDocumentContentType({ storedPath: "file.pdf" })).toBe("application/pdf");
  });

  it("maps image formats to the expected content type", () => {
    expect(getDocumentContentType({ storedPath: "file.jpg" })).toBe("image/jpeg");
    expect(getDocumentContentType({ storedPath: "file.jpeg" })).toBe("image/jpeg");
    expect(getDocumentContentType({ storedPath: "file.png" })).toBe("image/png");
    expect(getDocumentContentType({ storedPath: "file.tif" })).toBe("image/tiff");
    expect(getDocumentContentType({ storedPath: "file.tiff" })).toBe("image/tiff");
  });

  it("defaults to application/octet-stream for unknown extension", () => {
    expect(getDocumentContentType({ storedPath: "file" })).toBe(
      "application/octet-stream"
    );
  });
});
