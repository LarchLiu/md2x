import { DomMd2xRenderer } from '../../../../src/renderers/dom/md2x-renderer';
import { registerRenderer } from '../../../../src/renderers/renderer-registry';

registerRenderer(new DomMd2xRenderer());
