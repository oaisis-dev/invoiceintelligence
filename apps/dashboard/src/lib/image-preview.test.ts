import { describe, expect, it, vi } from "vitest";

vi.mock("sharp", () => {
  const toBuffer = vi.fn(async () => Buffer.from("png-data"));
  const png = vi.fn(() => ({ toBuffer }));
  const sharpFn = vi.fn(() => ({ png }));

  return {
    default: sharpFn,
    __spies: { sharpFn, png, toBuffer },
  };
});

import { convertTiffToPng } from "./image-preview";

describe("convertTiffToPng", () => {
  it("uses sharp to convert first TIFF page to PNG", async () => {
    const output = await convertTiffToPng(Buffer.from("tiff-data"));
    expect(output.toString()).toBe("png-data");
  });
});
