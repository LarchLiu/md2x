import { DomInfographicRenderer } from '../../../../src/renderers/dom/infographic-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomInfographicRenderer());
