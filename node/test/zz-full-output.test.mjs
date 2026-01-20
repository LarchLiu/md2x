import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { describe, test, before } from 'node:test';

import { loadApi } from './setup.mjs';
import { canUseBrowser, outDir } from './test-utils.mjs';

let api;

before(async () => {
  api = await loadApi();
});

describe('full.md outputs (default options)', () => {
  test('generates pdf/html/docx/png into test/out root', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');

    fs.mkdirSync(outDir, { recursive: true });

    const inputPath = path.join(path.dirname(outDir), 'fixtures', 'full.md');
    const base = path.join(outDir, 'full.default');

    const pdfPath = `${base}.pdf`;
    const htmlPath = `${base}.html`;
    const docxPath = `${base}.docx`;
    const pngPath = `${base}.png`;

    const r1 = await api.convertFile(inputPath, pdfPath);
    assert.strictEqual(r1.format, 'pdf');
    assert.ok(fs.existsSync(pdfPath));

    const r2 = await api.convertFile(inputPath, htmlPath);
    assert.strictEqual(r2.format, 'html');
    assert.ok(fs.existsSync(htmlPath));

    const r3 = await api.convertFile(inputPath, docxPath);
    assert.strictEqual(r3.format, 'docx');
    assert.ok(fs.existsSync(docxPath));

    const r4 = await api.convertFile(inputPath, pngPath);
    assert.strictEqual(r4.format, 'png');
    // Image split may produce multiple parts.
    const pngOutputs = Array.isArray(r4.outputPaths) ? r4.outputPaths : [r4.outputPath];
    assert.ok(pngOutputs.length >= 1);
    for (const p of pngOutputs) assert.ok(fs.existsSync(p));
  });
});

