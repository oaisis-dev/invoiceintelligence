export async function convertTiffToPng(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(input, { page: 0 }).png().toBuffer();
}
