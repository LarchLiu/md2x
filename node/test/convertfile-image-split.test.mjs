import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { loadApi } from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
});

describe('convertFile (image split parts)', () => {
  test('writes .part-XXX.png files and returns outputPaths', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2x-image-split-'));
    const inputPath = path.join(tmpDir, 'test-image-split.md');
    const outputPath = path.join(tmpDir, 'test-image-split.png');

    const content = `---
format: png
diagramMode: none
image:
  split: true
  splitMaxPixelHeight: 800
---

# Tall doc

${Array.from({ length: 600 }, (_, i) => `Paragraph ${i + 1}: lorem ipsum.`).join('\n\n')}
`;

    fs.writeFileSync(inputPath, content, 'utf8');

    try {
      const result = await api.convertFile(inputPath, outputPath);
      assert.strictEqual(result.format, 'png');
      assert.ok(Array.isArray(result.outputPaths));
      assert.ok(result.outputPaths.length > 1, 'expected multiple output parts');
      for (const p of result.outputPaths) assert.ok(fs.existsSync(p), `missing output part: ${p}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
