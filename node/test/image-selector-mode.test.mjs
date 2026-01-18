import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { loadApi } from './setup.mjs';

let api;

before(async () => {
  api = await loadApi();
});

function readPngHeight(buf) {
  // PNG IHDR starts at byte 8; width/height are 4-byte BE at offsets 16/20.
  if (!Buffer.isBuffer(buf) || buf.length < 24) return null;
  const sig = buf.slice(0, 8).toString('hex');
  if (sig !== '89504e470d0a1a0a') return null;
  return buf.readUInt32BE(20);
}

describe('image selectorMode behavior', () => {
  test('default selectorMode (stitch) excludes in-between content vs union', async () => {
    const markdown = `
<div id="a" style="width: 300px; height: 80px; background: #eee; border: 1px solid #ccc;">A</div>

<div style="height: 2000px;">SPACER</div>

<div id="c" style="width: 300px; height: 80px; background: #eee; border: 1px solid #ccc;">C</div>
`.trim();

    const baseOpts = {
      format: 'png',
      diagramMode: 'none',
      image: {
        selector: ['#a', '#c'],
        split: false,
        // Keep viewport stable across environments.
        viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
      },
    };

    // Default selectorMode is "stitch".
    const stitched = await api.convert(markdown, baseOpts);
    const stitchedH = readPngHeight(stitched.buffer);
    assert.ok(stitchedH && stitchedH > 0, 'expected stitched PNG height');

    const union = await api.convert(markdown, {
      ...baseOpts,
      image: { ...baseOpts.image, selectorMode: 'union' },
    });
    const unionH = readPngHeight(union.buffer);
    assert.ok(unionH && unionH > 0, 'expected union PNG height');

    assert.ok(unionH > stitchedH, `expected union (${unionH}) > stitch (${stitchedH})`);
    // Spacer should make union significantly taller.
    assert.ok(unionH - stitchedH > 500, `expected union to include spacer (delta=${unionH - stitchedH})`);
  });
});

