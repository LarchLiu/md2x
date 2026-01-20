/**
 * Markdown to PDF/DOCX/HTML Library API
 * Convert markdown content to various formats
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml'
import { NodeDocxExporter, NodeHtmlExporter, NodePdfExporter, NodeImageExporter } from './node-exporter';
import type { Md2xBaseOptions, Md2DocxOptions, Md2PdfOptions, Md2HtmlOptions, Md2ImageOptions } from './node-exporter';

// ============================================================================
// Shared types and utilities
// ============================================================================

export type OutputFormat = 'docx' | 'pdf' | 'html' | 'png' | 'jpg' | 'jpeg' | 'webp';

export type DiagramMode = 'img' | 'live' | 'none';

export type FrontMatterData = Record<string, unknown>;

export interface FrontMatterOptions {
  // Common options
  theme?: string;
  format?: OutputFormat;
  hrAsPageBreak?: boolean;
  // Image-specific options
  image?: Md2ImageOptions['image'];
  // HTML-specific options
  title?: string;
  standalone?: boolean;
  diagramMode?: DiagramMode;
  baseTag?: boolean;
  liveRuntime?: Md2HtmlOptions['liveRuntime'];
  liveRuntimeUrl?: string;
  cdn?: Md2HtmlOptions['cdn'];
  /** Extra directories to search for md2x templates referenced by ` ```md2x ` blocks */
  templatesDir?: Md2xBaseOptions['templatesDir'];
  // PDF-specific options
  pdf?: Md2PdfOptions['pdf'];
}

export function parseFrontMatter(markdown: string): { content: string; data: FrontMatterData; hasFrontMatter: boolean } {
  const md = String(markdown);
  const fmMatch = md.match(/^---\s*[\r\n]([\s\S]*?)[\r\n](?:---|\.\.\.)\s*(?:[\r\n]([\s\S]*))?$/);
  if (!fmMatch) {
    return { content: markdown, data: {}, hasFrontMatter: false };
  }

  try {
    const data = yaml.load(fmMatch[1]) as FrontMatterData;
    const content = fmMatch[2] || '';

    const hasFrontMatter = Object.keys(data).length > 0;
    return { content, data: data as FrontMatterData, hasFrontMatter };
  } catch {
    return { content: markdown, data: {}, hasFrontMatter: false };
  }
}

export function frontMatterToOptions(data: FrontMatterData): FrontMatterOptions {
  const out: FrontMatterOptions = {};

  // Common options
  if (typeof data.theme === 'string') out.theme = data.theme;
  if (typeof data.hrAsPageBreak === 'boolean') out.hrAsPageBreak = data.hrAsPageBreak;

  if (typeof data.format === 'string') {
    const fmt = data.format.toLowerCase();
    if (fmt === 'pdf' || fmt === 'docx' || fmt === 'html' || fmt === 'png' || fmt === 'jpg' || fmt === 'jpeg' || fmt === 'webp') {
      out.format = fmt;
    }
  }

  if (data.image && typeof data.image === 'object') {
    const img = data.image as any;
    const image: NonNullable<FrontMatterOptions['image']> = {};

    if (typeof img.type === 'string') {
      const t = img.type.toLowerCase();
      if (t === 'png' || t === 'jpeg' || t === 'webp') image.type = t;
      if (t === 'jpg') image.type = 'jpeg';
    }
    if (typeof img.quality === 'number' && Number.isFinite(img.quality)) {
      image.quality = img.quality;
    }
    if (typeof img.maxPixelWidth === 'number' && Number.isFinite(img.maxPixelWidth)) {
      image.maxPixelWidth = img.maxPixelWidth;
    }
    if (typeof img.split === 'boolean') {
      image.split = img.split;
    } else if (typeof img.split === 'string' && img.split.toLowerCase() === 'auto') {
      image.split = 'auto';
    }
    if (typeof img.splitMaxPixelHeight === 'number' && Number.isFinite(img.splitMaxPixelHeight)) {
      image.splitMaxPixelHeight = img.splitMaxPixelHeight;
    }
    if (typeof img.splitOverlapPx === 'number' && Number.isFinite(img.splitOverlapPx)) {
      image.splitOverlapPx = img.splitOverlapPx;
    }
    if (typeof img.fullPage === 'boolean') {
      image.fullPage = img.fullPage;
    }
    if (typeof img.selector === 'string') {
      image.selector = img.selector;
    } else if (Array.isArray(img.selector)) {
      // Multiple selectors are treated as a selector list (CSS comma-separated union).
      image.selector = img.selector.filter((s: unknown) => typeof s === 'string');
    }
    if (typeof img.selectorMode === 'string') {
      const m = img.selectorMode.toLowerCase();
      if (m === 'first' || m === 'each' || m === 'union' || m === 'stitch') {
        image.selectorMode = m;
      }
    }
    if (typeof img.selectorPadding === 'number' && Number.isFinite(img.selectorPadding)) {
      image.selectorPadding = img.selectorPadding;
    }
    // Only used when `image.selectorMode: "stitch"` (space between stitched elements).
    if (typeof img.selectorGap === 'number' && Number.isFinite(img.selectorGap)) {
      image.selectorGap = img.selectorGap;
    }
    if (typeof img.scrollToLoad === 'boolean') {
      image.scrollToLoad = img.scrollToLoad;
    }
    if (img.scroll && typeof img.scroll === 'object') {
      const s = img.scroll as any;
      const scroll: any = {};
      if (typeof s.stepPx === 'number' && Number.isFinite(s.stepPx)) scroll.stepPx = s.stepPx;
      if (typeof s.delayMs === 'number' && Number.isFinite(s.delayMs)) scroll.delayMs = s.delayMs;
      if (typeof s.maxSteps === 'number' && Number.isFinite(s.maxSteps)) scroll.maxSteps = s.maxSteps;
      if (typeof s.maxTimeMs === 'number' && Number.isFinite(s.maxTimeMs)) scroll.maxTimeMs = s.maxTimeMs;
      if (Object.keys(scroll).length > 0) image.scroll = scroll;
    }
    if (typeof img.omitBackground === 'boolean') {
      image.omitBackground = img.omitBackground;
    }
    if (typeof img.fromSurface === 'boolean') {
      image.fromSurface = img.fromSurface;
    }
    if (typeof img.captureBeyondViewport === 'boolean') {
      image.captureBeyondViewport = img.captureBeyondViewport;
    }
    if (img.viewport && typeof img.viewport === 'object') {
      const vp = img.viewport as any;
      const viewport: NonNullable<NonNullable<FrontMatterOptions['image']>['viewport']> = {};
      if (typeof vp.width === 'number' && Number.isFinite(vp.width)) viewport.width = vp.width;
      if (typeof vp.height === 'number' && Number.isFinite(vp.height)) viewport.height = vp.height;
      if (typeof vp.deviceScaleFactor === 'number' && Number.isFinite(vp.deviceScaleFactor)) {
        viewport.deviceScaleFactor = vp.deviceScaleFactor;
      }
      if (Object.keys(viewport).length > 0) {
        image.viewport = viewport;
      }
    }

    if (Object.keys(image).length > 0) {
      out.image = image;
    }
  }

  // HTML-specific options
  if (typeof data.title === 'string') out.title = data.title;
  if (typeof data.standalone === 'boolean') out.standalone = data.standalone;
  if (typeof data.baseTag === 'boolean') out.baseTag = data.baseTag;
  if (typeof (data as any).liveRuntime === 'string') {
    const v = String((data as any).liveRuntime).toLowerCase();
    if (v === 'inline' || v === 'cdn') out.liveRuntime = v;
  }
  if (typeof (data as any).liveRuntimeUrl === 'string') {
    out.liveRuntimeUrl = String((data as any).liveRuntimeUrl);
  }

  if (typeof data.diagramMode === 'string') {
    const dm = data.diagramMode.toLowerCase();
    if (dm === 'img' || dm === 'live' || dm === 'none') {
      out.diagramMode = dm;
    }
  }

  // CDN overrides (HTML live mode)
  if (data.cdn && typeof data.cdn === 'object') {
    out.cdn = data.cdn as Md2HtmlOptions['cdn'];
  }

  // md2x template directories (HTML/Image live mode)
  if (typeof (data as any).templatesDir === 'string') {
    out.templatesDir = (data as any).templatesDir as string;
  } else if (Array.isArray((data as any).templatesDir)) {
    out.templatesDir = (data as any).templatesDir.filter((v: unknown) => typeof v === 'string') as string[];
  }

  // PDF-specific options
  if (data.pdf && typeof data.pdf === 'object') {
    out.pdf = data.pdf as Md2PdfOptions['pdf'];
  }

  return out;
}

// ============================================================================
// Library API functions
// ============================================================================

/** Alias for FrontMatterOptions, used as conversion options */
export type ConvertOptions = FrontMatterOptions & {
  basePath?: string;
  /** Skip front matter parsing (use when markdown is already stripped of front matter) */
  skipFrontMatter?: boolean;
};

export interface ConvertResult {
  /** Output buffer */
  buffer: Buffer;
  /** Resolved output path */
  outputPath: string;
  /**
   * When converting to an image format with splitting enabled, multiple parts may be produced.
   * In that case, `buffer`/`outputPath` refer to the first part, and the full list is in
   * `buffers`/`outputPaths`.
   */
  buffers?: Buffer[];
  outputPaths?: string[];
  /** Output format used */
  format: OutputFormat;
}

export function formatToExtension(format: OutputFormat): string {
  switch (format) {
    case 'pdf':
      return '.pdf';
    case 'docx':
      return '.docx';
    case 'html':
      return '.html';
    case 'png':
      return '.png';
    case 'webp':
      return '.webp';
    case 'jpeg':
      return '.jpeg';
    case 'jpg':
      return '.jpg';
    default:
      return '.pdf';
  }
}

export async function markdownToDocxBuffer(markdown: string, options: Md2DocxOptions = {}): Promise<Buffer> {
  const exporter = new NodeDocxExporter();
  return exporter.exportToBuffer(markdown, options);
}

export async function markdownToPdfBuffer(markdown: string, options: Md2PdfOptions = {}): Promise<Buffer> {
  const exporter = new NodePdfExporter();
  return exporter.exportToBuffer(markdown, options);
}

export async function markdownToHtmlString(markdown: string, options: Md2HtmlOptions = {}): Promise<string> {
  const exporter = new NodeHtmlExporter();
  return exporter.exportToString(markdown, options);
}

export async function markdownToHtmlBuffer(markdown: string, options: Md2HtmlOptions = {}): Promise<Buffer> {
  const exporter = new NodeHtmlExporter();
  return exporter.exportToBuffer(markdown, options);
}

export async function markdownToImageBuffer(markdown: string, options: Md2ImageOptions = {}): Promise<Buffer> {
  const exporter = new NodeImageExporter();
  return exporter.exportToBuffer(markdown, options);
}

export async function markdownToImageBuffers(markdown: string, options: Md2ImageOptions = {}): Promise<Buffer[]> {
  const exporter = new NodeImageExporter();
  return exporter.exportToBuffers(markdown, options);
}

function inferFormatFromPath(outputPath: string): OutputFormat | null {
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.png') return 'png';
  if (ext === '.jpg') return 'jpg';
  if (ext === '.jpeg') return 'jpeg';
  if (ext === '.webp') return 'webp';
  return null;
}

function isImageFormat(format: OutputFormat): format is Extract<OutputFormat, 'png' | 'jpg' | 'jpeg' | 'webp'> {
  return format === 'png' || format === 'jpg' || format === 'jpeg' || format === 'webp';
}

function normalizeImageType(format: Extract<OutputFormat, 'png' | 'jpg' | 'jpeg' | 'webp'>): NonNullable<Md2ImageOptions['image']>['type'] {
  if (format === 'jpg') return 'jpeg';
  return format;
}

/**
 * Convert markdown content to buffer with front matter support.
 *
 * @param markdown - Markdown content (may include front matter)
 * @param options - Conversion options (override front matter)
 * @returns Buffer containing the converted content
 *
 * @example
 * ```ts
 * const md = `---
 * theme: academic
 * format: pdf
 * ---
 * # Hello World
 * `;
 * const { buffer, format } = await convert(md);
 * ```
 */
export async function convert(
  markdown: string,
  options: ConvertOptions = {}
): Promise<{ buffer: Buffer; format: OutputFormat; buffers?: Buffer[] }> {
  // Skip front matter parsing if already processed by caller
  const fm = options.skipFrontMatter
    ? { content: markdown, data: {}, hasFrontMatter: false }
    : parseFrontMatter(markdown);
  const fmOptions = fm.hasFrontMatter ? frontMatterToOptions(fm.data) : {};

  const format = options.format ?? fmOptions.format ?? 'pdf';
  const theme = options.theme ?? fmOptions.theme ?? 'default';
  // Defaults:
  // - DOCX: use "img" (offline-friendly; avoids runtime JS execution during printing)
  // - HTML/Image: use "live" unless overridden (requires CDN scripts in browser context)
  const defaultDiagramMode: DiagramMode = format === 'docx' ? 'img' : 'live';
  const diagramMode = options.diagramMode ?? fmOptions.diagramMode ?? defaultDiagramMode;
  const hrAsPageBreak = options.hrAsPageBreak ?? fmOptions.hrAsPageBreak ?? (format === 'html' || isImageFormat(format) ? false : true);
  const basePath = options.basePath ?? process.cwd();
  const markdownContent = fm.content;

  let buffer: Buffer;
  let buffers: Buffer[] | undefined;

  if (format === 'pdf') {
    buffer = await markdownToPdfBuffer(markdownContent, {
      theme,
      basePath,
      hrAsPageBreak,
      diagramMode,
      cdn: options.cdn ?? fmOptions.cdn,
      pdf: {
        ...options.pdf,
        ...fmOptions.pdf,
        title: options.title ?? fmOptions.title ?? 'Document',
      },
      templatesDir: options.templatesDir ?? fmOptions.templatesDir,
    });
  } else if (format === 'docx') {
    buffer = await markdownToDocxBuffer(markdownContent, {
      theme,
      basePath,
      hrAsPageBreak,
      templatesDir: options.templatesDir ?? fmOptions.templatesDir,
    });
  } else if (format === 'html') {
    buffer = await markdownToHtmlBuffer(markdownContent, {
      theme,
      basePath,
      diagramMode,
      hrAsPageBreak,
      title: options.title ?? fmOptions.title ?? 'Document',
      standalone: options.standalone ?? fmOptions.standalone,
      baseTag: options.baseTag ?? fmOptions.baseTag,
      liveRuntime: options.liveRuntime ?? fmOptions.liveRuntime,
      liveRuntimeUrl: options.liveRuntimeUrl ?? fmOptions.liveRuntimeUrl,
      cdn: options.cdn ?? fmOptions.cdn,
      templatesDir: options.templatesDir ?? fmOptions.templatesDir,
    });
  } else {
    const rawImageOptions = options.image ?? fmOptions.image;
    const image = rawImageOptions?.type ? rawImageOptions : { ...(rawImageOptions ?? {}), type: normalizeImageType(format) };
    // Image conversion can produce multiple parts when `image.split` is enabled.
    buffers = await markdownToImageBuffers(markdownContent, {
      theme,
      basePath,
      hrAsPageBreak,
      image,
      diagramMode,
      cdn: options.cdn ?? fmOptions.cdn,
      templatesDir: options.templatesDir ?? fmOptions.templatesDir,
    });
    if (!buffers.length) {
      throw new Error('Image conversion produced no output');
    }
    buffer = buffers[0];
  }

  return { buffer, format, buffers: buffers && buffers.length > 1 ? buffers : undefined };
}

/**
 * Convert a markdown file to PDF/DOCX/HTML with front matter support.
 *
 * This function:
 * 1. Reads the input markdown file
 * 2. Calls convert() to process the content
 * 3. Writes the output file
 *
 * @param inputPath - Path to the input markdown file
 * @param outputPath - Path to the output file (optional, defaults to input path with appropriate extension)
 * @param options - Conversion options (override front matter)
 * @returns ConvertResult with buffer, outputPath, and format
 *
 * @example
 * ```ts
 * // Basic usage
 * await convertFile('doc.md', 'doc.pdf');
 *
 * // With options
 * await convertFile('doc.md', 'doc.pdf', { theme: 'academic' });
 *
 * // Auto-detect format from output path
 * await convertFile('doc.md', 'doc.docx');
 *
 * // Use front matter format
 * await convertFile('doc.md'); // format from front matter or defaults to pdf
 * ```
 */
export async function convertFile(
  inputPath: string,
  outputPath?: string,
  options: ConvertOptions = {}
): Promise<ConvertResult> {
  const resolvedInputPath = path.resolve(inputPath);

  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`Input file not found: ${resolvedInputPath}`);
  }

  const markdown = fs.readFileSync(resolvedInputPath, 'utf-8');

  // Infer format from output path if not specified
  let format = options.format;
  if (!format && outputPath) {
    format = inferFormatFromPath(outputPath) ?? undefined;
  }

  // Set default title from filename for HTML
  const titleFromFile = path.basename(resolvedInputPath, path.extname(resolvedInputPath));

  // Call convert with merged options
  const result = await convert(markdown, {
    ...options,
    format,
    basePath: options.basePath ?? path.dirname(resolvedInputPath),
    title: options.title ?? titleFromFile,
  });

  // Determine output path
  let resolvedOutputPath: string;
  if (outputPath) {
    resolvedOutputPath = path.resolve(outputPath);
  } else {
    const inputDir = path.dirname(resolvedInputPath);
    const inputName = path.basename(resolvedInputPath, path.extname(resolvedInputPath));
    const outputExt = formatToExtension(result.format);
    resolvedOutputPath = path.join(inputDir, `${inputName}${outputExt}`);
  }

  // Ensure output directory exists and write file
  const outputDir = path.dirname(resolvedOutputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  // If the conversion produced multiple image parts, write them as `<name>.part-001.png`, etc.
  if (isImageFormat(result.format) && result.buffers && result.buffers.length > 1) {
    const bufs = result.buffers;
    const outputExt = formatToExtension(result.format);
    const base = resolvedOutputPath.endsWith(outputExt) ? resolvedOutputPath.slice(0, -outputExt.length) : resolvedOutputPath;
    const outputPaths: string[] = [];
    for (let i = 0; i < bufs.length; i++) {
      const part = String(i + 1).padStart(3, '0');
      const p = `${base}.part-${part}${outputExt}`;
      fs.writeFileSync(p, bufs[i]);
      outputPaths.push(p);
    }

    return {
      buffer: bufs[0],
      buffers: bufs,
      outputPath: outputPaths[0],
      outputPaths,
      format: result.format,
    };
  }

  fs.writeFileSync(resolvedOutputPath, result.buffer);

  return {
    buffer: result.buffer,
    outputPath: resolvedOutputPath,
    format: result.format,
  };
}
