import { DomSvgRenderer } from '../../../../src/renderers/dom/svg-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomSvgRenderer());
