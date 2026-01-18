import * as path from 'path';
import { fileURLToPath } from 'url';

// Set the module directory globally for code-split chunks to use
// This is needed because chunks use import.meta.url which points to the chunk file,
// not the entry point. The global allows chunks to find the correct dist directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
(globalThis as any).__md2x_module_dir__ = __dirname;

// Re-export from host modules
export { NodeDocxExporter, NodeHtmlExporter, NodePdfExporter, NodeImageExporter } from './host/node-exporter';
export type { Md2DocxOptions, Md2HtmlOptions, Md2PdfOptions, Md2ImageOptions } from './host/node-exporter';
export type { PdfOptions, ImageOptions } from './host/browser-renderer';

export {
  // Types
  type OutputFormat,
  type DiagramMode,
  type FrontMatterOptions,
  type ConvertOptions,
  type ConvertResult,
  // Functions
  parseFrontMatter,
  frontMatterToOptions,
  markdownToDocxBuffer,
  markdownToPdfBuffer,
  markdownToHtmlString,
  markdownToHtmlBuffer,
  markdownToImageBuffer,
  markdownToImageBuffers,
  convert,
  convertFile,
} from './host/index';
