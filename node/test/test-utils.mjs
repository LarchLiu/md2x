import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const testDir = __dirname;
export const outDir = path.join(testDir, 'out');

export function ensureOutDir() {
  fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

export function makeOutSubdir(prefix) {
  ensureOutDir();
  // `mkdtempSync` appends random suffix; keep outputs for inspection.
  return fs.mkdtempSync(path.join(outDir, prefix));
}

export function makeFrontMatterDoc(frontMatterYaml, body) {
  const fm = String(frontMatterYaml ?? '').trim();
  const b = String(body ?? '').trim();
  if (!fm) return `${b}\n`;
  return `---\n${fm}\n---\n\n${b}\n`;
}

export function writeUtf8(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

export async function withTempDir(prefix, fn) {
  const dir = makeOutSubdir(prefix);
  return await fn(dir);
}

export function isPng(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 8 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
}

export function isJpeg(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 3 && buf.slice(0, 3).toString('hex') === 'ffd8ff';
}

export function isWebp(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

let _browserAvailable;

export async function canUseBrowser(api) {
  if (typeof _browserAvailable === 'boolean') return _browserAvailable;

  try {
    // Small, deterministic render that forces Puppeteer usage.
    await api.convert('# browser-check', {
      format: 'png',
      diagramMode: 'none',
      image: {
        split: false,
        viewport: { width: 400, height: 300, deviceScaleFactor: 1 },
      },
    });
    _browserAvailable = true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Failed to launch the browser process')) {
      _browserAvailable = false;
    } else {
      throw e;
    }
  }

  return _browserAvailable;
}
