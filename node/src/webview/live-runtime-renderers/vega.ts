import { DomVegaRenderer } from '../../../../src/renderers/dom/vega-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomVegaRenderer('vega-lite'));
registerRenderer(new DomVegaRenderer('vega'));
