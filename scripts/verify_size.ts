import * as fs from "fs";
import * as path from "path";

const DATASETS_DIR = path.resolve(process.cwd(), "datasets");
const TARGET_GB = 5.0;
const TARGET_BYTES = TARGET_GB * 1024 * 1024 * 1024;

export function verifySize() {
  if (!fs.existsSync(DATASETS_DIR)) {
    console.error(`[Verify] Failed. Directory ${DATASETS_DIR} does not exist.`);
    process.exit(1);
  }

  let totalSize = 0;
  const files = fs.readdirSync(DATASETS_DIR);
  
  for (const file of files) {
    const fullPath = path.join(DATASETS_DIR, file);
    const stats = fs.statSync(fullPath);
    if (stats.isFile()) totalSize += stats.size;
  }

  const currentGB = (totalSize / 1024 / 1024 / 1024).toFixed(2);
  
  if (totalSize >= TARGET_BYTES) {
    console.log(`✅ SUCCESS: Repository payload exceeds 5.0 GB threshold (Current: ${currentGB} GB)`);
    process.exit(0);
  } else {
    console.error(`❌ FAILED: Repository payload is only ${currentGB} GB. Target is ${TARGET_GB} GB.`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("verify_size.ts")) {
  verifySize();
}
