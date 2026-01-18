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

function isJpeg(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 3 && buf.slice(0, 3).toString('hex') === 'ffd8ff';
}

function isWebp(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

function makeTallMarkdown(lines = 600) {
  const out = ['# Tall doc', ''];
  for (let i = 0; i < lines; i++) {
    out.push(`Paragraph ${i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`);
  }
  return out.join('\n\n') + '\n';
}

describe('convert (image via front matter)', () => {
  test('uses PNG format from front matter', async () => {
    const content = `---\nformat: png\ndiagramMode: none\nimage:\n  split: false\n---\n\n# Hello\n`;
    const { buffer, format } = await api.convert(content);
    assert.strictEqual(format, 'png');
    assert.ok(isPng(buffer));
  });

  test('uses JPG format from front matter', async () => {
    const content = `---\nformat: jpg\ndiagramMode: none\nimage:\n  split: false\n---\n\n# Hello\n`;
    const { buffer, format } = await api.convert(content);
    assert.strictEqual(format, 'jpg');
    assert.ok(isJpeg(buffer));
  });

  test('uses WebP format from front matter', async () => {
    const content = `---\nformat: webp\ndiagramMode: none\nimage:\n  split: false\n---\n\n# Hello\n`;
    const { buffer, format } = await api.convert(content);
    assert.strictEqual(format, 'webp');
    assert.ok(isWebp(buffer));
  });

  test('front matter split produces multiple buffers', async () => {
    const content = `---\nformat: png\ndiagramMode: none\nimage:\n  split: true\n  splitMaxPixelHeight: 800\n---\n\n${makeTallMarkdown(600)}\n`;
    const result = await api.convert(content);
    assert.strictEqual(result.format, 'png');
    assert.ok(isPng(result.buffer));
    assert.ok(Array.isArray(result.buffers));
    assert.ok(result.buffers.length > 1, 'expected multiple parts from split: true');
  });
});

