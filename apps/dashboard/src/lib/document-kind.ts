export type DocumentKind = "pdf" | "image" | "unknown";

const PDF_EXTENSIONS = new Set(["pdf"]);
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "tif", "tiff"]);

function extractExtension(path: string | null | undefined): string | null {
  if (!path) return null;
  const normalized = path.split(/[?#]/)[0] ?? "";
  const fileName = normalized.split("/").pop() ?? normalized;
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return null;
  }
  return fileName.slice(dotIndex + 1).toLowerCase();
}

function extensionToKind(extension: string | null): DocumentKind {
  if (!extension) return "unknown";
  if (PDF_EXTENSIONS.has(extension)) return "pdf";
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  return "unknown";
}

export function getDocumentKind(params: {
  storedPath?: string | null;
  originalFilename?: string | null;
}): DocumentKind {
  const candidates = [params.storedPath, params.originalFilename];
  for (const candidate of candidates) {
    const kind = extensionToKind(extractExtension(candidate));
    if (kind !== "unknown") {
      return kind;
    }
  }
  return "unknown";
}

export function getDocumentContentType(params: {
  storedPath?: string | null;
  originalFilename?: string | null;
}): string {
  const extension =
    extractExtension(params.storedPath) ?? extractExtension(params.originalFilename);

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "tif":
    case "tiff":
      return "image/tiff";
    default:
      return "application/octet-stream";
  }
}
