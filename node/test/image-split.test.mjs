import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { loadApi } from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
});

function isPng(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 8 && buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a';
}

function makeTallMarkdown(lines = 500) {
  const out = ['# Tall doc', ''];
  for (let i = 0; i < lines; i++) {
    out.push(`Paragraph ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`);
  }
  return out.join('\n\n') + '\n';
}

describe('image export splitting', () => {
  test('convert() returns multiple buffers when image.split is enabled', async () => {
    const markdown = makeTallMarkdown(600);
    const result = await api.convert(markdown, {
      format: 'png',
      diagramMode: 'none',
      image: {
        // Force splitting even for moderately tall pages.
        split: true,
        splitMaxPixelHeight: 800,
      },
    });

    assert.strictEqual(result.format, 'png');
    assert.ok(isPng(result.buffer));
    assert.ok(Array.isArray(result.buffers), 'expected result.buffers to be present when split produces multiple parts');
    assert.ok(result.buffers.length > 1, 'expected more than 1 image part');
    for (const b of result.buffers) assert.ok(isPng(b));
  });
});

