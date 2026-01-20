import type { BaseRenderer } from '../base-renderer';
import { registerRenderer } from '../renderer-registry';

import { DomMermaidRenderer } from './mermaid-renderer';
import { DomDotRenderer } from './dot-renderer';
import { DomVegaRenderer } from './vega-renderer';
import { DomInfographicRenderer } from './infographic-renderer';
import { DomJsonCanvasRenderer } from './canvas-renderer';
import { DomHtmlRenderer } from './html-renderer';
import { DomSvgRenderer } from './svg-renderer';
import { DomMd2xRenderer } from './md2x-renderer';

export const domRenderers: BaseRenderer[] = [
  new DomMermaidRenderer(),
  new DomVegaRenderer('vega-lite'),
  new DomVegaRenderer('vega'),
  new DomHtmlRenderer(),
  new DomSvgRenderer(),
  new DomDotRenderer(),
  new DomInfographicRenderer(),
  new DomJsonCanvasRenderer(),
  new DomMd2xRenderer(),
];

export function registerAllDomRenderers(): void {
  for (const r of domRenderers) {
    registerRenderer(r);
  }
}

