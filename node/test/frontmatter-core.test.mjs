import fs from 'node:fs';
import path from 'node:path';
import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { loadApi } from './setup.mjs';
import { readFixture } from './fixtures.mjs';
import { canUseBrowser, makeFrontMatterDoc, makeOutSubdir, writeUtf8 } from './test-utils.mjs';

let api;

before(async () => {
  api = await loadApi();
});

describe('front matter (core)', () => {
  test('parseFrontMatter handles invalid YAML gracefully', () => {
    const content = `---\ninvalid yaml: [unclosed bracket\n---\n\n# Invalid\n`;
    const parsed = api.parseFrontMatter(content);
    assert.strictEqual(parsed.hasFrontMatter, false);
  });

  test('parseFrontMatter handles no front matter', () => {
    const content = `# No Front Matter\n\nJust markdown.\n`;
    const parsed = api.parseFrontMatter(content);
    assert.strictEqual(parsed.hasFrontMatter, false);
    assert.strictEqual(parsed.content, content);
  });

  test('parseFrontMatter treats empty front matter as absent', () => {
    const content = `---\n---\n\n# Empty Front Matter\n`;
    const parsed = api.parseFrontMatter(content);
    assert.strictEqual(parsed.hasFrontMatter, false);
  });

  test('convert() applies front matter options to HTML output', async () => {
    const markdown = makeFrontMatterDoc(
      `
format: html
theme: default
title: FM HTML Title
standalone: true
baseTag: false
diagramMode: none
      `.trim(),
      readFixture('basic.md')
    );

    const { buffer, format } = await api.convert(markdown);
    assert.strictEqual(format, 'html');

    const html = buffer.toString('utf8');
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('<title>FM HTML Title</title>'));
    assert.ok(!html.includes('<base'), 'baseTag: false should omit <base>');
  });

  test('convert() respects standalone:false (front matter) and returns fragment', async () => {
    const markdown = makeFrontMatterDoc(
      `
format: html
theme: default
standalone: false
diagramMode: none
      `.trim(),
      readFixture('basic.md')
    );

    const { buffer, format } = await api.convert(markdown);
    assert.strictEqual(format, 'html');

    const html = buffer.toString('utf8');
    assert.ok(!html.includes('<!DOCTYPE html>'));
    assert.ok(!html.includes('<html'));
    assert.ok(html.includes('<strong>world</strong>'));
  });

  test('convertFile() uses format from front matter when outputPath is omitted (HTML)', async () => {
    const dir = makeOutSubdir('fm-convertfile-html-');
    const inputPath = path.join(dir, 'in.md');

    writeUtf8(
      inputPath,
      makeFrontMatterDoc(
        `
format: html
title: FM convertFile HTML
standalone: true
diagramMode: none
        `.trim(),
        readFixture('basic.md')
      )
    );

    const result = await api.convertFile(inputPath);
    assert.strictEqual(result.format, 'html');
    assert.ok(result.outputPath.endsWith('.html'));
    assert.ok(fs.existsSync(result.outputPath));

    const html = fs.readFileSync(result.outputPath, 'utf8');
    assert.ok(html.includes('<title>FM convertFile HTML</title>'));
  });

  test('front matter diagramMode:none keeps mermaid code blocks (HTML)', async () => {
    const markdown = makeFrontMatterDoc(
      `
format: html
standalone: true
diagramMode: none
      `.trim(),
      readFixture('with-diagrams.md')
    );

    const { buffer, format } = await api.convert(markdown);
    assert.strictEqual(format, 'html');
    assert.ok(buffer.toString('utf8').includes('language-mermaid'));
  });

  test('convertFile() uses format from front matter when outputPath is omitted (PDF)', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');

    const dir = makeOutSubdir('fm-convertfile-pdf-');
    const inputPath = path.join(dir, 'in.md');
    writeUtf8(inputPath, makeFrontMatterDoc('format: pdf\ndiagramMode: none', readFixture('basic.md')));

    const result = await api.convertFile(inputPath);
    assert.strictEqual(result.format, 'pdf');
    assert.ok(result.outputPath.endsWith('.pdf'));
    assert.ok(fs.existsSync(result.outputPath));
    assert.ok(result.buffer.length > 0);
  });

  test('front matter image.selectorMode affects output (default stitch vs union)', async (t) => {
    if (!(await canUseBrowser(api))) return t.skip('Chromium/Puppeteer not available in this environment');

    const readPngHeight = (buf) => {
      // PNG IHDR starts at byte 8; width/height are 4-byte BE at offsets 16/20.
      if (!Buffer.isBuffer(buf) || buf.length < 24) return null;
      const sig = buf.slice(0, 8).toString('hex');
      if (sig !== '89504e470d0a1a0a') return null;
      return buf.readUInt32BE(20);
    };

    const body = `
<div id="a" style="width: 300px; height: 80px; background: #eee; border: 1px solid #ccc;">A</div>

<div style="height: 2000px;">SPACER</div>

<div id="c" style="width: 300px; height: 80px; background: #eee; border: 1px solid #ccc;">C</div>
`.trim();

    const baseFrontMatter = `
format: png
diagramMode: none
image:
  selector:
    - '#a'
    - '#c'
  split: false
  viewport:
    width: 800
    height: 600
    deviceScaleFactor: 1
`.trim();

    // Default selectorMode is "stitch".
    const stitched = await api.convert(makeFrontMatterDoc(baseFrontMatter, body));
    const stitchedH = readPngHeight(stitched.buffer);
    assert.ok(stitchedH && stitchedH > 0, 'expected stitched PNG height');

    const union = await api.convert(
      makeFrontMatterDoc(
        `${baseFrontMatter}\n  selectorMode: union`,
        body
      )
    );
    const unionH = readPngHeight(union.buffer);
    assert.ok(unionH && unionH > 0, 'expected union PNG height');

    const out = makeOutSubdir('fm-image-selector-');
    fs.writeFileSync(path.join(out, 'stitched.png'), stitched.buffer);
    fs.writeFileSync(path.join(out, 'union.png'), union.buffer);

    assert.ok(unionH > stitchedH, `expected union (${unionH}) > stitch (${stitchedH})`);
    assert.ok(unionH - stitchedH > 500, `expected union to include spacer (delta=${unionH - stitchedH})`);
  });
});
