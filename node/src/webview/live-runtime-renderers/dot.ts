import { DomDotRenderer } from '../../../../src/renderers/dom/dot-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomDotRenderer());
