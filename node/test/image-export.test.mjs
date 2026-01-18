import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { loadApi } from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
});

describe('image export', () => {
  test('converts markdown to PNG buffer', async () => {
    const markdown = '# md2x image export\\n\\nHello.';
    const { buffer, format } = await api.convert(markdown, { format: 'png' });
    assert.strictEqual(format, 'png');
    assert.ok(buffer instanceof Buffer);
    assert.ok(buffer.length > 8);
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    assert.strictEqual(buffer.slice(0, 8).toString('hex'), '89504e470d0a1a0a');
  });
});

