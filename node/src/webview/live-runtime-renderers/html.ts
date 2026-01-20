import { DomHtmlRenderer } from '../../../../src/renderers/dom/html-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomHtmlRenderer());
