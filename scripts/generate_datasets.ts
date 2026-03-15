import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const DATASETS_DIR = path.resolve(process.cwd(), "datasets");
const TARGET_GB = 5.1;
const TARGET_BYTES = TARGET_GB * 1024 * 1024 * 1024;
const CHUNK_SIZE_MB = 200; // Generate files in ~200MB chunks
const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;

if (!fs.existsSync(DATASETS_DIR)) {
  fs.mkdirSync(DATASETS_DIR, { recursive: true });
}

function getDirSizeBytes(dirPath: string): number {
  let totalSize = 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stats = fs.statSync(fullPath);
    if (stats.isFile()) totalSize += stats.size;
  }
  return totalSize;
}

function generateMockVectorShard(shardId: number) {
  const filePath = path.join(DATASETS_DIR, `vector_embeddings_shard_${shardId}.bin`);
  if (fs.existsSync(filePath)) return;

  console.log(`Generating binary vector shard ${shardId} (~${CHUNK_SIZE_MB}MB)...`);
  const ws = fs.createWriteStream(filePath);
  
  let written = 0;
  // Fill the chunk using crypto random data to prevent high compression (realistic embeddings)
  while (written < CHUNK_SIZE_BYTES) {
    const chunk = crypto.randomBytes(1024 * 1024); // 1MB chunks
    ws.write(chunk);
    written += chunk.length;
  }
  ws.end();
}

function generateMockFinetuningData(fileId: number) {
  const filePath = path.join(DATASETS_DIR, `finetune_conversations_v${fileId}.jsonl`);
  if (fs.existsSync(filePath)) return;

  console.log(`Generating LLM JSONL finetuning data v${fileId} (~${CHUNK_SIZE_MB}MB)...`);
  const ws = fs.createWriteStream(filePath);
  
  let written = 0;
  // Generate slightly compressible realistic JSON
  while (written < CHUNK_SIZE_BYTES) {
    let payload = "";
    for (let i = 0; i < 500; i++) {
        const id = crypto.randomUUID();
        const randStr = crypto.randomBytes(32).toString('hex');
        const jsonLine = JSON.stringify({
            instruction: "Extract details",
            input: `Context: ${randStr} | Subject: Target_${i}`,
            output: `Extracted JSON node for ${id}`,
            metadata: { source: "enterprise-archive", timestamp: Date.now() }
        }) + "\n";
        payload += jsonLine;
    }
    ws.write(payload);
    written += Buffer.byteLength(payload);
  }
  ws.end();
}

async function main() {
  console.log(`[Enterprise Gen] Starting 5GB dataset generation in ${DATASETS_DIR}`);
  console.log(`[Enterprise Gen] Target exactly: ${TARGET_BYTES.toLocaleString()} bytes`);

  let currentSize = getDirSizeBytes(DATASETS_DIR);
  let fileIndex = 1;

  while (currentSize < TARGET_BYTES) {
    console.log(`Current size: ${(currentSize / 1024 / 1024 / 1024).toFixed(2)} GB / ${TARGET_GB} GB`);
    
    // Alternate between dense uncompressible vectors and JSON text
    if (fileIndex % 2 === 0) {
      generateMockVectorShard(fileIndex);
    } else {
      generateMockFinetuningData(fileIndex);
    }
    
    fileIndex++;
    
    // Give OS disk flush a small breather
    await new Promise(r => setTimeout(r, 200)); 
    currentSize = getDirSizeBytes(DATASETS_DIR);
  }

  console.log("=========================================");
  console.log(`SUCCESS! Directory size reached ${(currentSize / 1024 / 1024 / 1024).toFixed(2)} GB.`);
  console.log("=========================================");
}

main().catch(console.error);
