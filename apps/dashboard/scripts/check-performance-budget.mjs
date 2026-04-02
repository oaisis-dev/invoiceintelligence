import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const maxSingleChunkKb = Number(process.env.BUDGET_MAX_SINGLE_CHUNK_KB ?? 700);
const maxTotalChunksKb = Number(process.env.BUDGET_MAX_TOTAL_CHUNKS_KB ?? 1500);

execSync("npx next experimental-analyze --output", { stdio: "inherit" });

const chunkDir = join(
  process.cwd(),
  ".next",
  "diagnostics",
  "analyze",
  "_next",
  "static",
  "chunks"
);

if (!existsSync(chunkDir)) {
  throw new Error(`Analyze output not found at ${chunkDir}`);
}

const chunkStats = readdirSync(chunkDir)
  .filter((file) => file.endsWith(".js"))
  .map((file) => ({
    file,
    bytes: statSync(join(chunkDir, file)).size,
  }))
  .sort((a, b) => b.bytes - a.bytes);

if (chunkStats.length === 0) {
  throw new Error("No JS chunks found in analyze output");
}

const largestChunk = chunkStats[0];
const totalBytes = chunkStats.reduce((sum, chunk) => sum + chunk.bytes, 0);
const largestChunkKb = largestChunk.bytes / 1024;
const totalChunksKb = totalBytes / 1024;

console.log("\\nBundle budget report");
for (const chunk of chunkStats) {
  console.log(`- ${chunk.file}: ${(chunk.bytes / 1024).toFixed(1)} KB`);
}
console.log(`Total JS chunks: ${totalChunksKb.toFixed(1)} KB`);

const errors = [];
if (largestChunkKb > maxSingleChunkKb) {
  errors.push(
    `Largest JS chunk ${largestChunk.file} is ${largestChunkKb.toFixed(1)} KB (max ${maxSingleChunkKb} KB)`
  );
}

if (totalChunksKb > maxTotalChunksKb) {
  errors.push(
    `Total JS chunks are ${totalChunksKb.toFixed(1)} KB (max ${maxTotalChunksKb} KB)`
  );
}

if (errors.length > 0) {
  console.error("\\nPerformance budget check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("\\nPerformance budget check passed.");
