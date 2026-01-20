import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, '..', 'out');

if (!fs.existsSync(outDir)) process.exit(0);

for (const name of fs.readdirSync(outDir)) {
  const p = path.join(outDir, name);
  let st;
  try {
    st = fs.statSync(p);
  } catch {
    continue;
  }
  if (st.isDirectory()) {
    fs.rmSync(p, { recursive: true, force: true });
  }
}

