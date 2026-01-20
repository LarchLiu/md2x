import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { describe, test, before } from 'node:test';

import { loadApi } from './setup.mjs';
import { readFixture } from './fixtures.mjs';
import { canUseBrowser, isJpeg, isPng, isWebp, makeFrontMatterDoc, withTempDir, writeUtf8 } from './test-utils.mjs';

let api;

before(async () => {
  api = await loadApi();
});

function makeTallMarkdown(lines = 600) {
  const out = ['# Tall doc', ''];
  for (let i = 0; i < lines; i++) out.push(`Paragraph ${i + 1}: Lorem ipsum dolor sit amet.`);
  return out.join('\n\n') + '\n';
}

describe('format: image', () => {
  test('convert() supports png/jpg/jpeg/webp', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    const markdown = readFixture('basic.md');

    const png = await api.convert(markdown, { format: 'png', diagramMode: 'none', image: { split: false } });
    assert.strictEqual(png.format, 'png');
    assert.ok(isPng(png.buffer));

    const jpg = await api.convert(markdown, { format: 'jpg', diagramMode: 'none', image: { split: false } });
    assert.strictEqual(jpg.format, 'jpg');
    assert.ok(isJpeg(jpg.buffer));

    const jpeg = await api.convert(markdown, { format: 'jpeg', diagramMode: 'none', image: { split: false } });
    assert.strictEqual(jpeg.format, 'jpeg');
    assert.ok(isJpeg(jpeg.buffer));

    const webp = await api.convert(markdown, { format: 'webp', diagramMode: 'none', image: { split: false } });
    assert.strictEqual(webp.format, 'webp');
    assert.ok(isWebp(webp.buffer));
  });

  test('convert() uses image format from front matter', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    const markdown = makeFrontMatterDoc(
      `
format: png
diagramMode: none
image:
  split: false
      `.trim(),
      '# Hello\n'
    );
    const { buffer, format } = await api.convert(markdown);
    assert.strictEqual(format, 'png');
    assert.ok(isPng(buffer));
  });

  test('convert() split produces multiple buffers when enabled', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    const markdown = makeFrontMatterDoc(
      `
format: png
diagramMode: none
image:
  split: true
  splitMaxPixelHeight: 800
      `.trim(),
      makeTallMarkdown(600)
    );
    const result = await api.convert(markdown);
    assert.strictEqual(result.format, 'png');
    assert.ok(isPng(result.buffer));
    assert.ok(Array.isArray(result.buffers));
    assert.ok(result.buffers.length > 1);
  });

  test('convertFile() infers image format from output extension', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    await withTempDir('md2x-convertfile-imgext-', async (dir) => {
      const inputPath = path.join(dir, 'in.md');
      writeUtf8(inputPath, readFixture('basic.md'));

      const outPng = path.join(dir, 'out.png');
      const r1 = await api.convertFile(inputPath, outPng, {
        theme: 'default',
        diagramMode: 'none',
        image: { split: false },
      });
      assert.strictEqual(r1.format, 'png');
      assert.ok(isPng(fs.readFileSync(outPng)));

      const outWebp = path.join(dir, 'out.webp');
      const r2 = await api.convertFile(inputPath, outWebp, {
        theme: 'default',
        diagramMode: 'none',
        image: { split: false },
      });
      assert.strictEqual(r2.format, 'webp');
      assert.ok(isWebp(fs.readFileSync(outWebp)));
    });
  });

  test('convertFile() uses front matter when outputPath is omitted', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    await withTempDir('md2x-convertfile-imgfm-', async (dir) => {
      const inputPath = path.join(dir, 'in.md');
      writeUtf8(
        inputPath,
        makeFrontMatterDoc(
          `
format: webp
diagramMode: none
image:
  split: false
          `.trim(),
          readFixture('basic.md')
        )
      );

      const result = await api.convertFile(inputPath);
      assert.strictEqual(result.format, 'webp');
      assert.ok(result.outputPath.endsWith('.webp'));
      assert.ok(fs.existsSync(result.outputPath));
      assert.ok(isWebp(fs.readFileSync(result.outputPath)));
    });
  });

  test('convertFile() writes .part-XXX.png files when image.split is enabled (front matter)', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    await withTempDir('md2x-convertfile-image-split-', async (dir) => {
      const inputPath = path.join(dir, 'in.md');
      const outputPath = path.join(dir, 'out.png');

      writeUtf8(
        inputPath,
        makeFrontMatterDoc(
          `
format: png
diagramMode: none
image:
  split: true
  splitMaxPixelHeight: 800
          `.trim(),
          makeTallMarkdown(600)
        )
      );

      const result = await api.convertFile(inputPath, outputPath);
      assert.strictEqual(result.format, 'png');
      assert.ok(Array.isArray(result.outputPaths));
      assert.ok(result.outputPaths.length > 1, 'expected multiple output parts');
      assert.strictEqual(result.outputPath, result.outputPaths[0]);
      assert.ok(result.outputPaths[0].endsWith('.part-001.png'));
      for (const p of result.outputPaths) assert.ok(fs.existsSync(p), `missing output part: ${p}`);
    });
  });
});
