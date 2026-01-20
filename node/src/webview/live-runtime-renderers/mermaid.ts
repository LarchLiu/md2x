import { DomMermaidRenderer } from '../../../../src/renderers/dom/mermaid-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomMermaidRenderer());
