import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import {
  loadApi,
  ensureTestFile,
  inputPath,
  docxOutputPath,
  pdfOutputPath,
  htmlOutputPath,
} from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
  ensureTestFile();
});

function isPng(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 8 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
}

function isWebp(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

describe('convertFile', () => {
  test('converts to DOCX', async () => {
    await api.convertFile(inputPath, docxOutputPath, { theme: 'default' });
    assert.ok(fs.existsSync(docxOutputPath));
  });

  test('converts to PDF', async () => {
    await api.convertFile(inputPath, pdfOutputPath, { theme: 'default' });
    assert.ok(fs.existsSync(pdfOutputPath));
  });

  test('converts to HTML', async () => {
    await api.convertFile(inputPath, htmlOutputPath, { theme: 'default' });
    assert.ok(fs.existsSync(htmlOutputPath));
  });

  test('converts to PNG (inferred from output extension)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2x-convertfile-png-'));
    const tmpInputPath = path.join(tmpDir, 'in.md');
    const outputPath = path.join(tmpDir, 'out.png');
    try {
      fs.writeFileSync(tmpInputPath, '# Hello\n\nThis is a small fixture for image export.\n', 'utf8');
      const result = await api.convertFile(tmpInputPath, outputPath, {
        theme: 'default',
        // Avoid any CDN work; we only care about basic image export here.
        diagramMode: 'none',
        image: { split: false },
      });
      assert.strictEqual(result.format, 'png');
      assert.ok(fs.existsSync(outputPath));
      assert.ok(isPng(fs.readFileSync(outputPath)));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('converts to WebP (inferred from output extension)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2x-convertfile-webp-'));
    const tmpInputPath = path.join(tmpDir, 'in.md');
    const outputPath = path.join(tmpDir, 'out.webp');
    try {
      fs.writeFileSync(tmpInputPath, '# Hello\n\nThis is a small fixture for image export.\n', 'utf8');
      const result = await api.convertFile(tmpInputPath, outputPath, {
        theme: 'default',
        diagramMode: 'none',
        image: { split: false },
      });
      assert.strictEqual(result.format, 'webp');
      assert.ok(fs.existsSync(outputPath));
      assert.ok(isWebp(fs.readFileSync(outputPath)));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
