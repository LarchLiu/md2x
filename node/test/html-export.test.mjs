import fs from 'node:fs';
import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import {
  loadApi,
  ensureTestFile,
  inputPath,
  htmlOutputPath,
} from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
  ensureTestFile();
  // Always regenerate so assertions track current bootstrap strategy.
  await api.convertFile(inputPath, htmlOutputPath, { theme: 'default' });
});

describe('HTML export', () => {
  test('produces standalone document', () => {
    const html = fs.readFileSync(htmlOutputPath, 'utf8');
    assert.ok(html.includes('<!DOCTYPE html>'));
    assert.ok(html.includes('id="markdown-content"'));
  });

  test('includes live renderer bootstrap', () => {
    const html = fs.readFileSync(htmlOutputPath, 'utf8');
    assert.ok(html.includes('md2x live diagram renderer (worker mountToDom)'));
    assert.ok(html.includes('__md2xRenderDocument'));
    assert.ok(html.includes('(runtime: cdn)'));
    assert.ok(html.includes('/dist/renderer/live-runtime-core.js'));
    assert.ok(!html.includes('const workerSource ='));
  });

  test('liveRuntime: inline embeds worker bundle', async () => {
    const html = await api.markdownToHtmlString('# test', {
      standalone: true,
      diagramMode: 'live',
      liveRuntime: 'inline',
    });
    assert.ok(html.includes('(runtime: inline)'));
    assert.ok(html.includes('const workerSource ='));
  });

  test('references Mermaid CDN', () => {
    const html = fs.readFileSync(htmlOutputPath, 'utf8');
    assert.ok(html.includes('cdn.jsdelivr.net/npm/mermaid'));
  });
});
