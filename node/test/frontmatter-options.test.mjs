import fs from 'node:fs';
import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import {
  loadApi,
  fmPdfPath,
  fmHtmlPath,
  fmDocxPath,
  fmDiagramNonePath,
  fmDiagramImgPath,
} from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
});

describe('frontMatterToOptions', () => {
  test('converts PDF options', () => {
    const content = fs.readFileSync(fmPdfPath, 'utf8');
    const parsed = api.parseFrontMatter(content);
    const options = api.frontMatterToOptions(parsed.data);
    assert.strictEqual(options.format, 'pdf');
    assert.strictEqual(options.hrAsPageBreak, true);
    assert.strictEqual(options.pdf?.format, 'A4');
  });

  test('converts HTML options', () => {
    const content = fs.readFileSync(fmHtmlPath, 'utf8');
    const parsed = api.parseFrontMatter(content);
    const options = api.frontMatterToOptions(parsed.data);
    assert.strictEqual(options.format, 'html');
    assert.strictEqual(options.title, 'Custom HTML Title');
    assert.strictEqual(options.standalone, true);
    assert.strictEqual(options.diagramMode, 'live');
    assert.strictEqual(options.baseTag, false);
  });

  test('converts DOCX options', () => {
    const content = fs.readFileSync(fmDocxPath, 'utf8');
    const parsed = api.parseFrontMatter(content);
    const options = api.frontMatterToOptions(parsed.data);
    assert.strictEqual(options.format, 'docx');
    assert.strictEqual(options.hrAsPageBreak, false);
  });

  test('converts diagramMode: none', () => {
    const content = fs.readFileSync(fmDiagramNonePath, 'utf8');
    const parsed = api.parseFrontMatter(content);
    const options = api.frontMatterToOptions(parsed.data);
    assert.strictEqual(options.diagramMode, 'none');
  });

  test('converts diagramMode: img', () => {
    const content = fs.readFileSync(fmDiagramImgPath, 'utf8');
    const parsed = api.parseFrontMatter(content);
    const options = api.frontMatterToOptions(parsed.data);
    assert.strictEqual(options.diagramMode, 'img');
  });

  test('converts image options (split + selector)', () => {
    const content = `---\nformat: png\ndiagramMode: img\nimage:\n  selector:\n    - 'div.md2x-diagram[data-md2x-diagram-kind=\"mermaid\"]'\n    - 'div.md2x-diagram[data-md2x-diagram-kind=\"infographic\"]'\n  selectorMode: stitch\n  selectorGap: 12\n  selectorPadding: 8\n  split: auto\n  splitMaxPixelHeight: 12000\n  splitOverlapPx: 80\n---\n# Hello\n`;
    const parsed = api.parseFrontMatter(content);
    const options = api.frontMatterToOptions(parsed.data);
    assert.strictEqual(options.format, 'png');
    assert.strictEqual(options.diagramMode, 'img');
    assert.deepStrictEqual(options.image?.selector, [
      'div.md2x-diagram[data-md2x-diagram-kind="mermaid"]',
      'div.md2x-diagram[data-md2x-diagram-kind="infographic"]',
    ]);
    assert.strictEqual(options.image?.selectorMode, 'stitch');
    assert.strictEqual(options.image?.selectorGap, 12);
    assert.strictEqual(options.image?.selectorPadding, 8);
    assert.strictEqual(options.image?.split, 'auto');
    assert.strictEqual(options.image?.splitMaxPixelHeight, 12000);
    assert.strictEqual(options.image?.splitOverlapPx, 80);
  });
});
