import type { Md2DocxOptions, Md2HtmlOptions, Md2PdfOptions } from './host/node-exporter';
export { NodeDocxExporter, NodeHtmlExporter, NodePdfExporter } from './host/node-exporter';
export type { Md2DocxOptions, Md2HtmlOptions, Md2PdfOptions } from './host/node-exporter';
export type { PdfOptions } from './host/browser-renderer';

export async function markdownToDocxBuffer(markdown: string, options: Md2DocxOptions = {}): Promise<Buffer> {
  const { NodeDocxExporter } = await import('./host/node-exporter');
  const exporter = new NodeDocxExporter();
  return exporter.exportToBuffer(markdown, options);
}

export async function markdownFileToDocxFile(
  inputPath: string,
  outputPath: string,
  options: Md2DocxOptions = {}
): Promise<void> {
  const { NodeDocxExporter } = await import('./host/node-exporter');
  const exporter = new NodeDocxExporter();
  return exporter.exportToFile(inputPath, outputPath, options);
}

export async function markdownToPdfBuffer(markdown: string, options: Md2PdfOptions = {}): Promise<Buffer> {
  const { NodePdfExporter } = await import('./host/node-exporter');
  const exporter = new NodePdfExporter();
  return exporter.exportToBuffer(markdown, options);
}

export async function markdownToHtmlString(markdown: string, options: Md2HtmlOptions = {}): Promise<string> {
  const { NodeHtmlExporter } = await import('./host/node-exporter');
  const exporter = new NodeHtmlExporter();
  return exporter.exportToString(markdown, options);
}

export async function markdownToHtmlBuffer(markdown: string, options: Md2HtmlOptions = {}): Promise<Buffer> {
  const { NodeHtmlExporter } = await import('./host/node-exporter');
  const exporter = new NodeHtmlExporter();
  return exporter.exportToBuffer(markdown, options);
}

export async function markdownFileToPdfFile(
  inputPath: string,
  outputPath: string,
  options: Md2PdfOptions = {}
): Promise<void> {
  const { NodePdfExporter } = await import('./host/node-exporter');
  const exporter = new NodePdfExporter();
  return exporter.exportToFile(inputPath, outputPath, options);
}

export async function markdownFileToHtmlFile(
  inputPath: string,
  outputPath: string,
  options: Md2HtmlOptions = {}
): Promise<void> {
  const { NodeHtmlExporter } = await import('./host/node-exporter');
  const exporter = new NodeHtmlExporter();
  return exporter.exportToFile(inputPath, outputPath, options);
}
