import { DomJsonCanvasRenderer } from '../../../../src/renderers/dom/canvas-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomJsonCanvasRenderer());
