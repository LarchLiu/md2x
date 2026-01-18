import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
import { describe, test, before } from 'node:test';
import { pathToFileURL } from 'node:url';

import { loadApi } from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
});

describe('md2x templateDir option', () => {
  test('resolves templates from external templateDir (type + template filename)', async () => {
    const tmpDocDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2x-doc-'));
    const tmpTplDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2x-tpl-'));
    const tplPath = path.join(tmpTplDir, 'vue', 'my-component.vue');
    fs.mkdirSync(path.dirname(tplPath), { recursive: true });
    fs.writeFileSync(
      tplPath,
      `<script setup>\nconst data = templateData;\n</script>\n<template><div class=\"ok\">ok</div></template>\n`,
      'utf8'
    );

    const md = [
      '# test',
      '',
      '```md2x',
      "type: 'vue',",
      // Intentionally only a filename; resolver should use type + '/' + template.
      "template: 'my-component.vue',",
      "data: [{ title: 'a' }]",
      '```',
      '',
    ].join('\n');

    const html = await api.markdownToHtmlString(md, {
      basePath: tmpDocDir,
      diagramMode: 'live',
      standalone: true,
      templateDir: tmpTplDir,
    });

    // The template should be embedded from tmpTplDir (not from basePath).
    assert.ok(html.includes(pathToFileURL(tplPath).href));
    // Also keep the raw template key so loader can still find it.
    assert.ok(html.includes('\"my-component.vue\"'));
    assert.ok(html.includes('\"vue/my-component.vue\"'));
  });
});

