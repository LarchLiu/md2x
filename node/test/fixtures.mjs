import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const fixturesDir = path.join(__dirname, 'fixtures');

export function fixturePath(relPath) {
  return path.join(fixturesDir, relPath);
}

export function readFixture(relPath) {
  return fs.readFileSync(fixturePath(relPath), 'utf8');
}

