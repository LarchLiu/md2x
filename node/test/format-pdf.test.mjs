import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { describe, test, before } from 'node:test';

import { loadApi } from './setup.mjs';
import { readFixture } from './fixtures.mjs';
import { canUseBrowser, makeFrontMatterDoc, withTempDir, writeUtf8 } from './test-utils.mjs';

let api;

before(async () => {
  api = await loadApi();
});

describe('format: pdf', () => {
  test('convert() returns PDF buffer when options.format=pdf', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    const markdown = readFixture('basic.md');
    const { buffer, format } = await api.convert(markdown, { format: 'pdf', theme: 'default', diagramMode: 'none' });
    assert.strictEqual(format, 'pdf');
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  });

  test('convert() uses format from front matter', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    const markdown = makeFrontMatterDoc(
      `
format: pdf
theme: default
pdf:
  format: A4
      `.trim(),
      readFixture('basic.md')
    );

    const { buffer, format } = await api.convert(markdown, { diagramMode: 'none' });
    assert.strictEqual(format, 'pdf');
    assert.ok(buffer.length > 0);
  });

  test('frontMatterToOptions maps common PDF options', () => {
    const markdown = makeFrontMatterDoc(
      `
format: pdf
theme: default
hrAsPageBreak: true
pdf:
  format: A4
  margin:
    top: 25mm
    bottom: 25mm
    left: 15mm
    right: 15mm
  displayHeaderFooter: true
  headerTemplate: '<div><span class="title"></span></div>'
  footerTemplate: '<div>Page <span class="pageNumber"></span></div>'
      `.trim(),
      readFixture('basic.md')
    );

    const parsed = api.parseFrontMatter(markdown);
    const options = api.frontMatterToOptions(parsed.data);

    assert.strictEqual(options.format, 'pdf');
    assert.strictEqual(options.hrAsPageBreak, true);
    assert.strictEqual(options.pdf?.format, 'A4');
    assert.strictEqual(options.pdf?.margin?.top, '25mm');
    assert.strictEqual(options.pdf?.margin?.left, '15mm');
    assert.strictEqual(options.pdf?.displayHeaderFooter, true);
    assert.ok(options.pdf?.headerTemplate?.includes('class="title"'));
    assert.ok(options.pdf?.footerTemplate?.includes('class="pageNumber"'));
  });

  test('options override front matter format', async () => {
    const markdown = makeFrontMatterDoc('format: pdf', readFixture('basic.md'));
    const { format } = await api.convert(markdown, { format: 'html', standalone: false, diagramMode: 'none' });
    assert.strictEqual(format, 'html');
  });

  test('convertFile() uses front matter when outputPath is omitted', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    await withTempDir('md2x-pdf-fm-', async (dir) => {
      const inputPath = path.join(dir, 'in.md');
      const markdown = makeFrontMatterDoc(
        `
format: pdf
theme: default
pdf:
  format: Letter
  landscape: true
  margin:
    top: 10mm
      `.trim(),
        readFixture('basic.md')
      );

      writeUtf8(inputPath, markdown);

      const result = await api.convertFile(inputPath);
      assert.strictEqual(result.format, 'pdf');
      assert.ok(result.outputPath.endsWith('.pdf'));
      assert.ok(fs.existsSync(result.outputPath));
      assert.ok(result.buffer.length > 0);
    });
  });
});
