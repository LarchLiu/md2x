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

describe('format: docx', () => {
  test('convert() returns DOCX buffer when options.format=docx', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    const markdown = readFixture('basic.md');
    const { buffer, format } = await api.convert(markdown, { format: 'docx', theme: 'default', diagramMode: 'none' });
    assert.strictEqual(format, 'docx');
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  });

  test('convert() uses format from front matter', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    const markdown = makeFrontMatterDoc(
      `
format: docx
theme: default
hrAsPageBreak: false
      `.trim(),
      readFixture('basic.md')
    );

    const { buffer, format } = await api.convert(markdown, { diagramMode: 'none' });
    assert.strictEqual(format, 'docx');
    assert.ok(buffer.length > 0);
  });

  test('frontMatterToOptions maps common DOCX options', () => {
    const markdown = makeFrontMatterDoc(
      `
format: docx
theme: default
hrAsPageBreak: false
      `.trim(),
      readFixture('basic.md')
    );

    const parsed = api.parseFrontMatter(markdown);
    const options = api.frontMatterToOptions(parsed.data);

    assert.strictEqual(options.format, 'docx');
    assert.strictEqual(options.hrAsPageBreak, false);
  });

  test('convertFile() uses front matter when outputPath is omitted', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');
    await withTempDir('md2x-docx-fm-', async (dir) => {
      const inputPath = path.join(dir, 'in.md');
      writeUtf8(
        inputPath,
        makeFrontMatterDoc(
          `
format: docx
theme: default
          `.trim(),
          readFixture('basic.md')
        )
      );

      const result = await api.convertFile(inputPath);
      assert.strictEqual(result.format, 'docx');
      assert.ok(result.outputPath.endsWith('.docx'));
      assert.ok(fs.existsSync(result.outputPath));
      assert.ok(result.buffer.length > 0);
    });
  });
});
