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
  // JPEG SOI marker: FF D8 FF
  return Buffer.isBuffer(buf) && buf.length >= 3 && buf.slice(0, 3).toString('hex') === 'ffd8ff';
}

function isWebp(buf) {
  // RIFF....WEBP container
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP'
  );
}

describe('image export formats', () => {
  const markdown = '# md2x image export\n\nHello.';

  test('converts markdown to PNG', async () => {
    const { buffer, format } = await api.convert(markdown, { format: 'png', diagramMode: 'none' });
    assert.strictEqual(format, 'png');
    assert.ok(isPng(buffer));
  });

  test('converts markdown to JPEG (jpg)', async () => {
    const { buffer, format } = await api.convert(markdown, { format: 'jpg', diagramMode: 'none' });
    assert.strictEqual(format, 'jpg');
    assert.ok(isJpeg(buffer));
  });

  test('converts markdown to JPEG (jpeg)', async () => {
    const { buffer, format } = await api.convert(markdown, { format: 'jpeg', diagramMode: 'none' });
    assert.strictEqual(format, 'jpeg');
    assert.ok(isJpeg(buffer));
  });

  test('converts markdown to WebP', async () => {
    const { buffer, format } = await api.convert(markdown, { format: 'webp', diagramMode: 'none' });
    assert.strictEqual(format, 'webp');
    assert.ok(isWebp(buffer));
  });
});

