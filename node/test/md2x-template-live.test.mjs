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

describe('md2x live template rendering', () => {
  test('embeds md2x vue template and injects data via templateData placeholder', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'md2x-template-'));
    const tplPath = path.join(tmpDir, 'vue', 'my-component.vue');
    fs.mkdirSync(path.dirname(tplPath), { recursive: true });

    // Minimal Vue SFC template used by md2x blocks.
    fs.writeFileSync(
      tplPath,
      `<script setup>
const data = templateData;
</script>

<template>
  <div class="root">{{ Array.isArray(data) ? data.length : 'nope' }}</div>
</template>
`,
      'utf8'
    );

    const md = [
      '# md2x vue template test',
      '',
      '```md2x',
      "type: 'vue',",
      "template: 'my-component.vue',",
      "data: [{ title: 'hello', message: 'world' }]",
      '```',
      '',
    ].join('\n');

    const html = await api.markdownToHtmlString(md, {
      basePath: tmpDir,
      standalone: true,
      diagramMode: 'live',
    });

    const tplHref = pathToFileURL(tplPath).href;

    // 1) Template content is embedded into the live bootstrap (no fetch needed at runtime).
    assert.ok(html.includes('const md2xTemplateFiles ='));
    assert.ok(html.includes(tplHref));
    // The bootstrap JSON replaces `<` with `\\u003c` to avoid `</script>` hazards.
    assert.ok(html.includes('\\u003cscript setup>'));
    assert.ok(html.includes('templateData'));

    // 2) The live bootstrap includes the placeholder replacement logic.
    assert.ok(html.includes("split('templateData').join('(' + json + ')')"));
    assert.ok(html.includes('JSON.stringify(cfg.data'));
    // Avoid putting a literal closing script tag sequence in the bootstrap source.
    assert.ok(html.includes("split('</').join('<\\\\/')") || html.includes("split('</').join('<\\/')"));
  });
});
