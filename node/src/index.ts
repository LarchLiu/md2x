import * as path from 'path';
import { fileURLToPath } from 'url';

// Set the module directory globally for code-split chunks to use
// This is needed because chunks use import.meta.url which points to the chunk file,
// not the entry point. The global allows chunks to find the correct dist directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
(globalThis as any).__md2x_module_dir__ = __dirname;

// Re-export exporters
export { NodeDocxExporter, NodeHtmlExporter, NodePdfExporter, NodeImageExporter } from './host/node-exporter';

// Re-export all types from types.ts
export type {
  OutputFormat,
  DiagramMode,
  FrontMatterData,
  FrontMatterOptions,
  ImageOptions,
  PdfOptions,
  MarkdownToHtmlStringOptions,
  CdnOptions,
  ConvertOptions,
  ConvertResult,
  Md2xTemplateConfig,
  Md2xBaseOptions,
  Md2DocxOptions,
  Md2PdfOptions,
  Md2ImageOptions,
  Md2HtmlOptions,
  RenderResult,
  BrowserRenderer,
  NodePlatformOutput,
  CreateNodePlatformOptions,
  CreatedNodePlatform,
} from './host/types';

// Re-export functions
export {
  parseFrontMatter,
  frontMatterToOptions,
  markdownToHtml,
  markdownToStandaloneHtml,
  markdownToDocxBuffer,
  markdownToPdfBuffer,
  markdownToHtmlString,
  markdownToHtmlBuffer,
  markdownToImageBuffer,
  markdownToImageBuffers,
  convert,
  convertFile,
} from './host/index';
