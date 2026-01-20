/**
 * Node DOCX Exporter
 *
 * Thin Node.js wrapper around the shared `src/exporters/docx-exporter.ts`.
 * The Node provides:
 * - A minimal Node PlatformAPI (resource/storage/file/document)
 * - A Puppeteer-backed PluginRenderer for diagrams/HTML/SVG
 *
 * This keeps the Node behavior aligned with the VSCode extension implementation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { createBrowserRenderer, type BrowserRenderer, type PdfOptions, type ImageOptions } from './browser-renderer';
import { createNodePlatform } from './node-platform';
import { plugins } from '../../../src/plugins/index';
import type { PluginRenderer, RendererThemeConfig } from '../../../src/types/index';

export interface Md2xTemplateConfig {
  template: string;
  type: 'vue' | 'html' | 'svelte';
  data: any;
}

// Helper to get module directory - uses global set by entry point, or falls back to import.meta.url
function getModuleDir(): string {
  if ((globalThis as any).__md2x_module_dir__) {
    return (globalThis as any).__md2x_module_dir__;
  }
  return path.dirname(fileURLToPath(import.meta.url));
}

export type Md2xBaseOptions = {
  theme?: string;
  basePath?: string;
  /**
   * When true, horizontal rules (---, ***, ___) will be converted to page breaks in print/PDF.
   * Note: this hides `<hr>` visually (default: false for HTML).
   */
  hrAsPageBreak?: boolean;
  /**
   * Diagram/template rendering mode for PDF export:
   * - "img": pre-render diagrams before printing (default; offline-friendly)
   * - "live": render in the browser before printing (required for md2x Vue templates)
   * - "none": do not process diagrams/templates
   */
  diagramMode?: 'img' | 'live' | 'none';
  /**
   * Extra directories to search for md2x templates referenced by ` ```md2x ` blocks.
   * Useful when templates live outside the markdown folder.
   *
   * Can be a single path or a list of paths. Relative paths are resolved against `basePath`.
   */
  templatesDir?: string | string[];
};

export type Md2DocxOptions = Md2xBaseOptions;

export type Md2PdfOptions = Md2xBaseOptions & {
  pdf?: PdfOptions;
  /**
   * CDN overrides for live mode.
   * Same shape as HTML export's `cdn` option.
   */
  cdn?: Md2HtmlOptions['cdn'];
};

export type Md2ImageOptions = Md2xBaseOptions & {
  image?: ImageOptions;
  /**
   * CDN overrides for live diagram mode.
   * Same shape as HTML export's `cdn` option.
   */
  cdn?: Md2HtmlOptions['cdn'];
};

export type Md2HtmlOptions = Md2xBaseOptions & {
  /** Document title for standalone HTML output */
  title?: string;
  /** When true, returns a full HTML document with embedded CSS (default: true) */
  standalone?: boolean;
  /**
   * Live diagram runtime injection strategy (only used when `diagramMode: "live"`).
   * - "inline": embed the runtime JS into the HTML (largest output, most self-contained)
   * - "cdn": reference the runtime JS from a CDN (smallest HTML output)
   *
   * Default: "cdn" for HTML export (to keep output small); PDF/Image always use "inline".
   */
  liveRuntime?: 'inline' | 'cdn';
  /**
   * Custom runtime URL when `liveRuntime: "cdn"`.
   *
   * - For the new chunked runtime: provide a base URL that ends with `/dist/renderer/` (or any directory URL),
   *   e.g. "https://cdn.jsdelivr.net/npm/md2x@0.7.3/dist/renderer/".
   * - Back-compat: you can also provide a full `.js` URL to a monolithic runtime script.
   */
  liveRuntimeUrl?: string;
  /**
   * Optional CDN overrides (URLs). Only used when `diagramMode: "live"`.
   */
  cdn?: Partial<{
    mermaid: string;
    /** Vue 3 global build (required for md2x vue templates in live mode) */
    vue: string;
    /** vue3-sfc-loader UMD (required for md2x vue templates in live mode) */
    vueSfcLoader: string;
    /**
     * ESM URL that exports `compile` (e.g. `svelte/compiler` build).
     * Used for md2x Svelte templates in live mode.
     */
    svelteCompiler: string;
    /**
     * Base URL used to resolve runtime module imports (e.g. `svelte/internal`, `svelte/store`).
     * Example: "https://esm.sh/svelte@5/".
     */
    svelteBase: string;
  }>;
  /** When true, emit a `<base href="file://.../">` tag so relative URLs resolve against basePath (default: true) */
  baseTag?: boolean;
};

function ensureBase64Globals(): void {
  // Node 18+ usually has atob/btoa, but keep a safe fallback.
  if (typeof globalThis.atob !== 'function') {
    (globalThis as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
  }
  if (typeof globalThis.btoa !== 'function') {
    (globalThis as any).btoa = (bin: string) => Buffer.from(bin, 'binary').toString('base64');
  }
}

async function loadRendererThemeConfig(themeId: string): Promise<RendererThemeConfig> {
  const platform = globalThis.platform as any;
  const text = await platform.resource.fetch(`themes/presets/${themeId}.json`);
  const theme = JSON.parse(text) as any;
  const fontFamily = theme?.fontScheme?.body?.fontFamily;
  const fontSize = theme?.fontScheme?.body?.fontSize ? parseFloat(theme.fontScheme.body.fontSize) : undefined;

  return {
    fontFamily: typeof fontFamily === 'string' ? fontFamily : undefined,
    fontSize: typeof fontSize === 'number' && Number.isFinite(fontSize) ? fontSize : undefined,
  };
}

function createPluginRenderer(
  browserRenderer: BrowserRenderer | null,
  basePath: string,
  themeConfig: RendererThemeConfig,
  md2xTemplateFiles?: Record<string, string>,
  cdnOverrides?: Md2HtmlOptions['cdn']
): PluginRenderer | null {
  if (!browserRenderer) {
    return null;
  }

  return {
    async render(type: string, content: string | object) {
      const renderInput =
        type === 'md2x' && typeof content === 'string'
          ? ({
              code: content,
              templateFiles: md2xTemplateFiles ?? {},
              cdn: {
                vue: cdnOverrides?.vue,
                vueSfcLoader: cdnOverrides?.vueSfcLoader,
                svelteCompiler: cdnOverrides?.svelteCompiler,
                svelteBase: cdnOverrides?.svelteBase,
              },
            } as any)
          : content;

      const result = await browserRenderer.render(type, renderInput, basePath, themeConfig);
      if (!result) return null;
      return result;
    },
  };
}

function escapeHtmlText(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x3C;/gi, '<')
    .replace(/&#x3E;/gi, '>')
    .replace(/&#x26;/gi, '&')
    .replace(/&#60;/g, '<')
    .replace(/&#62;/g, '>')
    .replace(/&#38;/g, '&');
}

function collectMd2xTemplateFiles(
  html: string,
  basePath: string,
  templatesDir?: string | string[]
): Record<string, string> {
  // Match md2x code blocks in the HTML fragment.
  // Same considerations as diagrams: rehype-highlight may add "hljs".
  const codeBlockRegex = new RegExp(`<pre><code class="[^"]*\\blanguage-md2x\\b[^"]*">([\\s\\S]*?)<\\/code><\\/pre>`, 'gi');
  const matches = [...html.matchAll(codeBlockRegex)];
  const out: Record<string, string> = {};

  const extractQuoted = (text: string, key: string): string => {
    // Best-effort: `key: 'value'` / `key: "value"` (usually single-line).
    // Note: intentionally does not support template literals to avoid escaping issues and surprises.
    const m = text.match(new RegExp(`\\b${key}\\s*:\\s*(['"])([^\\n\\r]*?)\\1`, 'i'));
    return (m?.[2] ?? '').trim();
  };

  const normalizeMd2xTemplateRef = (type: string, tpl: string): string => {
    const t = String(type || '').trim().toLowerCase();
    const v = String(tpl || '').trim();
    if (!t || !v) return v;
    // If user already provided a path/URL, keep it.
    if (v.includes('/') || v.includes('\\') || v.includes('://') || v.startsWith('file://')) return v;
    return `${t}/${v}`;
  };

  const normalizeTemplateDirs = (): string[] => {
    if (!templatesDir) return [];
    const arr = Array.isArray(templatesDir) ? templatesDir : [templatesDir];
    return arr
      .map((d) => String(d || '').trim())
      .filter(Boolean);
  };

  for (const match of matches) {
    const codeHtml = match[1] ?? '';
    // If highlight spans are present, strip tags to recover the raw text.
    // Important: strip tags BEFORE decoding entities, otherwise real "&lt;...&gt;" in strings would be lost.
    const decodedCode = decodeHtmlEntities(String(codeHtml || '').replace(/<[^>]*>/g, ''));
    const typeRef = extractQuoted(decodedCode, 'type');
    const templateRaw = extractQuoted(decodedCode, 'template');
    const templateRef = normalizeMd2xTemplateRef(typeRef, templateRaw);
    if (!templateRef) continue;

    const resolveExistingFilePath = (ref: string): string | null => {
      try {
        if (String(ref).toLowerCase().startsWith('file://')) {
          const p = fileURLToPath(ref);
          return fs.existsSync(p) ? p : null;
        }
        if (path.isAbsolute(ref)) {
          return fs.existsSync(ref) ? ref : null;
        }

        const moduleDir = getModuleDir();
        const extraDirs = normalizeTemplateDirs().map((d) => {
          try {
            if (String(d).toLowerCase().startsWith('file://')) return fileURLToPath(d);
          } catch {}
          // Relative template dir is resolved against basePath to match user expectations.
          return path.isAbsolute(d) ? d : path.join(basePath, d);
        });

        const extraCandidates: string[] = [];
        for (const dir of extraDirs) {
          extraCandidates.push(path.join(dir, ref));
        }

        const candidates = [
          // User templates usually live next to the markdown document (basePath).
          path.join(basePath, ref),
          // Optional external template dirs (CLI --template-dir).
          ...extraCandidates,
          // Packaged CLI may ship templates next to the module root (node/dist/templates/*).
          path.join(moduleDir, 'templates', ref),
          // Dev/monorepo fallback (this repo layout): node/src/templates/* (moduleDir is node/src/host).
          path.join(moduleDir, '..', 'templates', ref),
          // Another dev fallback when moduleDir is node/dist: node/src/templates/*.
          path.join(moduleDir, '..', 'src', 'templates', ref),
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) return p;
        }
        return null;
      } catch {
        return null;
      }
    };

    const filePath = resolveExistingFilePath(templateRef);
    if (!filePath) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const href = pathToFileURL(filePath).href;
      // Prefer absolute file:// keys to avoid browser fetch/CORS restrictions.
      out[href] = content;
      // Also keep the original key as a fallback (for loaders that pass relative paths through).
      out[templateRef] = content;
      // And keep the raw `template:` value too (so old blocks keep working).
      if (templateRaw) out[templateRaw] = content;
    } catch {
      // Skip missing templates; renderer will show a "missing template" message.
    }
  }

  return out;
}

function collectMd2xTemplateFilesFromMarkdown(
  markdown: string,
  basePath: string,
  templatesDir?: string | string[]
): Record<string, string> {
  // Match fenced md2x blocks:
  // ```md2x
  // ...
  // ```
  const fenceRegex = /```md2x[^\n\r]*[\r\n]([\s\S]*?)```/gi;
  const matches = [...String(markdown || '').matchAll(fenceRegex)];
  const out: Record<string, string> = {};

  const extractQuoted = (text: string, key: string): string => {
    const m = text.match(new RegExp(`\\b${key}\\s*:\\s*(['"])([^\\n\\r]*?)\\1`, 'i'));
    return (m?.[2] ?? '').trim();
  };

  const normalizeMd2xTemplateRef = (type: string, tpl: string): string => {
    const t = String(type || '').trim().toLowerCase();
    const v = String(tpl || '').trim();
    if (!t || !v) return v;
    if (v.includes('/') || v.includes('\\') || v.includes('://') || v.startsWith('file://')) return v;
    return `${t}/${v}`;
  };

  const normalizeTemplateDirs = (): string[] => {
    if (!templatesDir) return [];
    const arr = Array.isArray(templatesDir) ? templatesDir : [templatesDir];
    return arr
      .map((d) => String(d || '').trim())
      .filter(Boolean);
  };

  const resolveExistingFilePath = (ref: string): string | null => {
    try {
      if (String(ref).toLowerCase().startsWith('file://')) {
        const p = fileURLToPath(ref);
        return fs.existsSync(p) ? p : null;
      }
      if (path.isAbsolute(ref)) {
        return fs.existsSync(ref) ? ref : null;
      }

      const moduleDir = getModuleDir();
      const extraDirs = normalizeTemplateDirs().map((d) => {
        try {
          if (String(d).toLowerCase().startsWith('file://')) return fileURLToPath(d);
        } catch {}
        return path.isAbsolute(d) ? d : path.join(basePath, d);
      });

      const extraCandidates: string[] = [];
      for (const dir of extraDirs) {
        extraCandidates.push(path.join(dir, ref));
      }

      const candidates = [
        path.join(basePath, ref),
        ...extraCandidates,
        path.join(moduleDir, 'templates', ref),
        path.join(moduleDir, '..', 'templates', ref),
        path.join(moduleDir, '..', 'src', 'templates', ref),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) return p;
      }
      return null;
    } catch {
      return null;
    }
  };

  for (const match of matches) {
    const code = String(match[1] ?? '');
    const typeRef = extractQuoted(code, 'type');
    const templateRaw = extractQuoted(code, 'template');
    const templateRef = normalizeMd2xTemplateRef(typeRef, templateRaw);
    if (!templateRef) continue;

    const filePath = resolveExistingFilePath(templateRef);
    if (!filePath) continue;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const href = pathToFileURL(filePath).href;
      out[href] = content;
      out[templateRef] = content;
      if (templateRaw) out[templateRaw] = content;
    } catch {
      // ignore
    }
  }

  return out;
}

async function processDiagrams(
  html: string,
  browserRenderer: BrowserRenderer | null,
  basePath: string,
  themeConfig: RendererThemeConfig,
  mode: 'img' | 'live' | 'none',
  templatesDir?: string | string[],
  cdnOverrides?: Md2HtmlOptions['cdn']
): Promise<string> {
  if (mode !== 'img') return html;
  if (!browserRenderer) return html;

  // md2x templates are local files. Pre-load them on the Node side to avoid file:// fetch issues in the browser page.
  const md2xTemplateFiles = collectMd2xTemplateFiles(html, basePath, templatesDir);

  // Build supported languages from plugin system
  // Only include plugins that handle 'code' nodes (not 'html' or 'image' only)
  const pluginLangs = plugins
    .filter(p => p.nodeSelector.includes('code'))
    .map(p => p.language)
    .filter((lang): lang is string => lang !== null);

  // Add common aliases that plugins support via extractContent override
  const aliases = ['graphviz', 'gv', 'vegalite'];
  const supportedLangs = [...pluginLangs, ...aliases].join('|');

  if (!supportedLangs) return html;

  // Match code blocks with diagram languages
  // rehype-highlight adds "hljs" class, so we need to match both formats:
  // - class="language-mermaid" (without highlight)
  // - class="hljs language-mermaid" (with highlight)
  // Note: \\s\\S must be double-escaped in template strings for RegExp constructor
  const codeBlockRegex = new RegExp(
    `<pre><code class="(?:hljs )?language-(${supportedLangs})">([\\s\\S]*?)<\\/code><\\/pre>`,
    'gi'
  );

  const matches = [...html.matchAll(codeBlockRegex)];

  for (const match of matches) {
    const [fullMatch, lang, code] = match;
    // rehype-highlight wraps tokens in <span>. Strip tags before decoding entities to preserve real "<" in code.
    const decodedCode = decodeHtmlEntities(String(code || '').replace(/<[^>]*>/g, ''));

    // Normalize language aliases to renderer types
    let renderType = lang.toLowerCase();
    if (renderType === 'graphviz' || renderType === 'gv') renderType = 'dot';
    if (renderType === 'vegalite') renderType = 'vega-lite';

    try {
      const renderInput =
        renderType === 'md2x'
          ? ({
              code: decodedCode,
              templateFiles: md2xTemplateFiles,
              cdn: {
                vue: cdnOverrides?.vue,
                vueSfcLoader: cdnOverrides?.vueSfcLoader,
                svelteCompiler: cdnOverrides?.svelteCompiler,
                svelteBase: cdnOverrides?.svelteBase,
              },
            } as any)
          : decodedCode;

      const result = await browserRenderer.render(renderType, renderInput, basePath, themeConfig);
      if (result && result.base64) {
        // Tag the wrapper/img with kind so callers can target specific diagram types via CSS selectors,
        // e.g. `.md2x-diagram[data-md2x-diagram-kind="mermaid"]`.
        const kind = escapeHtmlText(renderType);
        const imgTag = `<div class="md2x-diagram" data-md2x-diagram-kind="${kind}"><img class="md2x-diagram" data-md2x-diagram-kind="${kind}" src="data:image/${result.format};base64,${result.base64}" alt="${escapeHtmlText(
          `${lang} diagram`
        )}" style="max-width: 100%;" /></div>`;
        html = html.replace(fullMatch, imgTag);
      }
    } catch (e) {
      console.warn(`Failed to render ${lang} diagram:`, e);
      // Keep original code block on error
    }
  }

  return html;
}

async function markdownToHtmlFragment(
  markdown: string,
  browserRenderer: BrowserRenderer | null,
  basePath: string,
  themeConfig: RendererThemeConfig,
  diagramMode: 'img' | 'live' | 'none',
  templatesDir?: string | string[],
  cdnOverrides?: Md2HtmlOptions['cdn']
): Promise<string> {
  // Import markdown processor dynamically
  const { unified } = await import('unified');
  const remarkParse = (await import('remark-parse')).default;
  const remarkGfm = (await import('remark-gfm')).default;
  const remarkMath = (await import('remark-math')).default;
  const remarkSuperSub = (await import('../../../src/plugins/remark-super-sub')).default;
  const remarkRehype = (await import('remark-rehype')).default;
  const rehypeKatex = (await import('rehype-katex')).default;
  const rehypeHighlight = (await import('rehype-highlight')).default;
  const rehypeStringify = (await import('rehype-stringify')).default;
  const { visit } = await import('unist-util-visit');

  // Rehype plugin to mark block-level images
  // An image is block-level only if:
  // 1. It's the only image in the paragraph
  // 2. There's no substantial text content (only labels like "**text:**" before the image are OK)
  function rehypeBlockImages() {
    return (tree: any) => {
      visit(tree, 'element', (node: any) => {
        if (node.tagName !== 'p') return;

        const children = node.children || [];
        if (children.length === 0) return;

        // Count images and check for text content
        let imageCount = 0;
        let imageIndex = -1;
        let hasSubstantialTextAfterImage = false;
        let foundImage = false;

        for (let i = 0; i < children.length; i++) {
          const child = children[i];

          if (child.type === 'element' && child.tagName === 'img') {
            imageCount++;
            imageIndex = i;
            foundImage = true;
          } else if (foundImage) {
            // Check for text after the image
            if (child.type === 'text' && child.value.trim() !== '') {
              hasSubstantialTextAfterImage = true;
            } else if (child.type === 'element' && child.tagName !== 'br') {
              // Any element after image (except br) means it's inline
              hasSubstantialTextAfterImage = true;
            }
          }
        }

        // Only mark as block-image if:
        // - Exactly one image in the paragraph
        // - No substantial text after the image
        if (imageCount === 1 && !hasSubstantialTextAfterImage && imageIndex >= 0) {
          const img = children[imageIndex];
          img.properties = img.properties || {};
          const existingClass = img.properties.className || [];
          img.properties.className = Array.isArray(existingClass)
            ? [...existingClass, 'block-image']
            : [existingClass, 'block-image'];
        }
      });
    };
  }

  // Create processor
  const processor = unified()
    .use(remarkParse)
    // Keep consistent with extension/webview + DOCX: reserve single `~text~` for subscript.
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkSuperSub)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeBlockImages)
    .use(rehypeStringify, { allowDangerousHtml: true });

  // Process markdown
  const file = await processor.process(markdown);
  let html = String(file);

  // Process diagrams (mermaid, graphviz, vega-lite, etc.)
  html = await processDiagrams(html, browserRenderer, basePath, themeConfig, diagramMode, templatesDir, cdnOverrides);

  return html;
}

let __md2xLiveWorkerJsCache: string | null = null;

function loadLiveWorkerJs(): string {
  if (__md2xLiveWorkerJsCache) return __md2xLiveWorkerJsCache;

  const moduleDir = getModuleDir();
  const candidates = [
    // Published package: node/dist/renderer/puppeteer-render-worker.js
    path.join(moduleDir, 'renderer', 'puppeteer-render-worker.js'),
    // Dev: node/src/host -> node/dist/renderer/puppeteer-render-worker.js
    path.join(moduleDir, '..', '..', 'dist', 'renderer', 'puppeteer-render-worker.js'),
    // Fallbacks
    path.join(moduleDir, '..', 'dist', 'renderer', 'puppeteer-render-worker.js'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        __md2xLiveWorkerJsCache = fs.readFileSync(p, 'utf-8');
        return __md2xLiveWorkerJsCache;
      }
    } catch {
      // ignore
    }
  }

  throw new Error(
    'Missing live renderer runtime: puppeteer-render-worker.js. ' +
      'Run node node/build.mjs to build node/dist assets.'
  );
}

function detectLiveRenderTypesFromHtml(html: string): string[] {
  const src = String(html || '');
  const types = new Set<string>();
  const re = /\blanguage-([a-z0-9-]+)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let t = String(m[1] || '').toLowerCase();
    if (t === 'graphviz' || t === 'gv') t = 'dot';
    if (t === 'vegalite') t = 'vega-lite';
    if (t) types.add(t);
  }
  return Array.from(types);
}

function getDefaultLiveRuntimeCdnBaseUrl(): string {
  try {
    const moduleDir = getModuleDir();
    const pkgPath = path.join(moduleDir, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as any;
    const name = typeof pkg?.name === 'string' ? pkg.name : 'md2x';
    const version = typeof pkg?.version === 'string' ? pkg.version : 'latest';
    // Keep scoped package names as path segments (e.g. "@scope/pkg").
    const safeName = encodeURIComponent(name).replace(/%2F/g, '/');
    const safeVersion = encodeURIComponent(version);
    return `https://cdn.jsdelivr.net/npm/${safeName}@${safeVersion}/dist/renderer/`;
  } catch {
    return 'https://cdn.jsdelivr.net/npm/md2x@latest/dist/renderer/';
  }
}

function buildLiveDiagramBootstrap(
  themeConfig: RendererThemeConfig | null,
  baseHref: string,
  cdnOverrides: Md2HtmlOptions['cdn'] | undefined,
  md2xTemplateFiles: Record<string, string> | undefined,
  runtime?: { mode?: 'inline' | 'cdn'; url?: string },
  requiredRenderTypes?: string[]
): string {
  // Prevent `</script>` inside embedded JSON (e.g., Vue SFC source) from terminating the bootstrap script tag.
  const jsonForInlineScript = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

  // Mermaid is still loaded as a global for MermaidRenderer.
  const mermaidSrc = (cdnOverrides && (cdnOverrides as any).mermaid)
    ? String((cdnOverrides as any).mermaid)
    : 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

  // Default is inline (compat). HTML export can opt into `liveRuntime: "cdn"` to avoid
  // embedding the full runtime JS into the HTML output.
  const liveRuntimeMode: 'inline' | 'cdn' = runtime?.mode === 'cdn' ? 'cdn' : 'inline';
  const liveRuntimeUrl = runtime?.url;

  const optsJson = jsonForInlineScript({
    baseHref: baseHref || '',
    themeConfig: themeConfig ?? null,
    md2xTemplateFiles: md2xTemplateFiles ?? {},
    cdn: cdnOverrides ?? {},
    rootSelector: '#markdown-content',
  });

  if (liveRuntimeMode === 'cdn') {
    const maybeUrl = (typeof liveRuntimeUrl === 'string' && liveRuntimeUrl.trim()) ? liveRuntimeUrl.trim() : '';
    const isSingleJs = !!maybeUrl && /\.js(?:\?.*)?$/i.test(maybeUrl);

    // Back-compat: allow pointing to a single monolithic runtime script.
    if (isSingleJs) {
      const workerUrl = maybeUrl;
      return `
  <!-- md2x live diagram renderer (worker mountToDom) (runtime: cdn) -->
  <script>try { window.__md2xLiveDone = false; } catch {}</script>
  <script src="${escapeHtmlText(mermaidSrc)}"></script>
  <script src="${escapeHtmlText(workerUrl)}"></script>
  <script>
  (function () {
    const opts = ${optsJson};
    const workerUrl = ${jsonForInlineScript(workerUrl)};
    const start = Date.now();

    function runWhenReady() {
      const fn = window.__md2xRenderDocument;
      if (typeof fn === 'function') {
        fn(opts).catch(() => { try { window.__md2xLiveDone = true; } catch {} });
        return;
      }
      if (Date.now() - start > 15000) {
        try {
          console.error('[md2x] live runtime not loaded (cdn). Check network/CSP or use liveRuntime=\"inline\".', workerUrl);
        } catch {}
        try { window.__md2xLiveDone = true; } catch {}
        return;
      }
      setTimeout(runWhenReady, 25);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runWhenReady, { once: true });
    } else {
      runWhenReady();
    }
  })();
  </script>`;
    }

    const baseUrlRaw = maybeUrl || getDefaultLiveRuntimeCdnBaseUrl();
    const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw : (baseUrlRaw + '/');

    const chunkByType: Record<string, string> = {
      mermaid: 'live-runtime-mermaid.js',
      dot: 'live-runtime-dot.js',
      vega: 'live-runtime-vega.js',
      'vega-lite': 'live-runtime-vega.js',
      infographic: 'live-runtime-infographic.js',
      canvas: 'live-runtime-canvas.js',
      html: 'live-runtime-html.js',
      svg: 'live-runtime-svg.js',
      md2x: 'live-runtime-md2x.js',
    };

    const types = Array.isArray(requiredRenderTypes) ? requiredRenderTypes : [];
    const chunks = new Set<string>();
    for (const t of types) {
      const k = String(t || '').trim().toLowerCase();
      const name = chunkByType[k];
      if (name) chunks.add(name);
    }

    const needMermaid = chunks.has('live-runtime-mermaid.js');

    const coreUrl = new URL('live-runtime-core.js', baseUrl).href;
    const chunkTags = Array.from(chunks)
      .sort()
      .map((name) => {
        const u = new URL(name, baseUrl).href;
        return `  <script src="${escapeHtmlText(u)}"></script>`;
      })
      .join('\n');

    return `
  <!-- md2x live diagram renderer (worker mountToDom) (runtime: cdn) -->
  <script>try { window.__md2xLiveDone = false; } catch {}</script>
${needMermaid ? `  <script src="${escapeHtmlText(mermaidSrc)}"></script>\n` : ''}  <script src="${escapeHtmlText(coreUrl)}"></script>
${chunkTags}
  <script>
  (function () {
    const opts = ${optsJson};
    function run() {
      const fn = window.__md2xRenderDocument;
      if (typeof fn === 'function') {
        fn(opts).catch(() => { try { window.__md2xLiveDone = true; } catch {} });
      } else {
        try { window.__md2xLiveDone = true; } catch {}
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  })();
  </script>`;
  }

  const workerSource = loadLiveWorkerJs();

  return `
  <!-- md2x live diagram renderer (worker mountToDom) (runtime: inline) -->
  <script>try { window.__md2xLiveDone = false; } catch {}</script>
  <script src="${escapeHtmlText(mermaidSrc)}"></script>
  <script>
  (function () {
    const workerSource = ${jsonForInlineScript(workerSource)};
    const s = document.createElement('script');
    s.textContent = workerSource;
    document.head.appendChild(s);
  })();
  </script>
  <script>
  (function () {
    const opts = ${optsJson};
    const start = Date.now();

    function runWhenReady() {
      const fn = window.__md2xRenderDocument;
      if (typeof fn === 'function') {
        fn(opts).catch(() => { try { window.__md2xLiveDone = true; } catch {} });
        return;
      }
      if (Date.now() - start > 15000) {
        try { window.__md2xLiveDone = true; } catch {}
        return;
      }
      setTimeout(runWhenReady, 25);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runWhenReady, { once: true });
    } else {
      runWhenReady();
    }
  })();
  </script>`;
}

/**
 * Node DOCX Exporter Class (public API used by node/src/host/index.ts)
 */
export class NodeDocxExporter {
  /**
   * Export markdown to DOCX buffer
   */
  async exportToBuffer(markdown: string, options: Md2DocxOptions = {}): Promise<Buffer> {
    ensureBase64Globals();

    const themeId = options.theme || 'default';
    const basePath = options.basePath ?? process.cwd();
    const moduleDir = getModuleDir();

    const { platform, getCapturedBuffer } = createNodePlatform({
      moduleDir,
      selectedThemeId: themeId,
      output: { kind: 'buffer' },
      settings: {
        docxHrAsPageBreak: options.hrAsPageBreak ?? true,
      },
    });

    const previousPlatform = (globalThis as any).platform;
    (globalThis as any).platform = platform;

    // Ensure DocumentService resolves relative images from the intended basePath.
    const virtualDocPath = path.join(basePath, '__md2x__.md');

    let browserRenderer: BrowserRenderer | null = null;
    try {
      browserRenderer = await createBrowserRenderer();
      if (browserRenderer) {
        await browserRenderer.initialize();
      }

      const themeConfig = await loadRendererThemeConfig(themeId);
      const md2xTemplateFiles = collectMd2xTemplateFilesFromMarkdown(markdown, basePath, options.templatesDir);
      const pluginRenderer = createPluginRenderer(browserRenderer, basePath, themeConfig, md2xTemplateFiles);

      // Dynamic import to reduce bundle size - docx is only loaded when needed
      const { default: DocxExporter } = await import('../../../src/exporters/docx-exporter');
      const exporter = new DocxExporter(pluginRenderer);
      exporter.setBaseUrl?.(pathToFileURL(virtualDocPath).href);

      const result = await exporter.exportToDocx(markdown, '__md2x__.docx', null);
      if (!result.success) {
        throw new Error(result.error || 'DOCX export failed');
      }

      const buffer = getCapturedBuffer();
      if (!buffer) {
        throw new Error('DOCX export produced no output buffer');
      }
      return buffer;
    } finally {
      try {
        if (browserRenderer) {
          await browserRenderer.close();
        }
      } finally {
        (globalThis as any).platform = previousPlatform;
      }
    }
  }

}

/**
 * Load theme CSS for PDF export
 */
async function loadThemeCss(themeId: string): Promise<string> {
  const platform = globalThis.platform as any;

  // Initialize themeManager first (required for font config)
  const themeManager = (await import('../../../src/utils/theme-manager')).default;
  await themeManager.initialize();

  // Load theme preset
  const themeText = await platform.resource.fetch(`themes/presets/${themeId}.json`);
  const theme = JSON.parse(themeText);

  // Load layout scheme
  const layoutText = await platform.resource.fetch(`themes/layout-schemes/${theme.layoutScheme}.json`);
  const layoutScheme = JSON.parse(layoutText);

  // Load color scheme
  const colorText = await platform.resource.fetch(`themes/color-schemes/${theme.colorScheme}.json`);
  const colorScheme = JSON.parse(colorText);

  // Load table style
  const tableText = await platform.resource.fetch(`themes/table-styles/${theme.tableStyle}.json`);
  const tableStyle = JSON.parse(tableText);

  // Load code theme
  const codeText = await platform.resource.fetch(`themes/code-themes/${theme.codeTheme}.json`);
  const codeTheme = JSON.parse(codeText);

  // Import theme-to-css dynamically to avoid circular dependencies
  const { themeToCSS } = await import('../../../src/utils/theme-to-css');
  return themeToCSS(theme, layoutScheme, colorScheme, tableStyle, codeTheme);
}

/**
 * Load base CSS styles for PDF
 */
async function loadBaseCss(hrAsPageBreak: boolean = true): Promise<string> {
  // Base styles for markdown rendering
  // When hrAsPageBreak is true, hr elements will trigger page breaks
  const hrStyles = hrAsPageBreak
    ? `
/* Horizontal Rule as Page Break */
hr {
  height: 0;
  padding: 0;
  margin: 0;
  background-color: transparent;
  border: 0;
  page-break-after: always;
  break-after: page;
  visibility: hidden;
}`
    : `
/* Horizontal Rule */
hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #e1e4e8;
  border: 0;
}`;

  return `
/* Base PDF Styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
}

.markdown-body, #markdown-content {
  max-width: 100%;
  padding: 20px;
}

/* Wide content auto-scaling for PDF */
/* Use transform scale to fit wide content within page width */
/* The actual scale value will be set dynamically via JavaScript */
#markdown-content > div[style*="width"] {
  transform-origin: top left;
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
h3 { font-size: 1.25em; }
h4 { font-size: 1em; }
h5 { font-size: 0.875em; }
h6 { font-size: 0.85em; color: #6a737d; }

/* Paragraphs */
p {
  margin-top: 0;
  margin-bottom: 16px;
}

/* Links */
a {
  color: #0366d6;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Lists */
ul, ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

li {
  margin-bottom: 4px;
}

li + li {
  margin-top: 4px;
}

/* Code */
code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

pre {
  padding: 16px;
  /* PDFs can't scroll horizontally; wrap long lines instead of clipping. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 3px;
  margin-top: 0;
  margin-bottom: 16px;
}

pre code {
  padding: 0;
  margin: 0;
  font-size: 100%;
  background-color: transparent;
  border: 0;
  /* Inherit wrapping behavior from <pre> for PDFs */
  white-space: inherit;
  overflow-wrap: inherit;
  word-break: inherit;
}

/* Blockquotes */
blockquote {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin: 0 0 16px 0;
}

blockquote > :first-child {
  margin-top: 0;
}

blockquote > :last-child {
  margin-bottom: 0;
}

/* Tables */
table {
  border-collapse: collapse;
  border-spacing: 0;
  margin-top: 0;
  margin-bottom: 16px;
  width: auto;
}

th, td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

th {
  font-weight: 600;
  background-color: #f6f8fa;
}

tr:nth-child(2n) {
  background-color: #f6f8fa;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  box-sizing: content-box;
}

/* Diagrams (rendered images) */
.md2x-diagram {
  text-align: center;
  break-inside: avoid;
  page-break-inside: avoid;
}

.md2x-diagram .md2x-diagram-inner {
  display: inline-block;
  max-width: 100%;
  text-align: left;
}

.md2x-diagram .md2x-diagram-mount {
  display: inline-block;
  max-width: 100%;
}

.md2x-diagram .vega-embed {
  display: inline-block;
  max-width: 100%;
  width: auto !important;
}

.md2x-diagram .md2x-diagram-inner svg,
.md2x-diagram .md2x-diagram-inner > svg {
  display: block;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
}

.md2x-diagram img,
img.md2x-diagram {
  display: block;
  max-width: 100%;
  height: auto;
  margin-left: auto;
  margin-right: auto;
  break-inside: avoid;
  page-break-inside: avoid;
}

#markdown-content svg {
  display: block;
  margin-left: auto;
  margin-right: auto;
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Block-level images: marked by rehypeBlockImages plugin */
img.block-image {
  display: block;
  margin: 16px 0;
}

/* Task Lists */
.task-list-item {
  list-style-type: none;
}

.task-list-item input {
  margin: 0 0.2em 0.25em -1.6em;
  vertical-align: middle;
}

/* KaTeX Math */
.katex {
  font-size: 1.1em;
}

.katex-display {
  margin: 1em 0;
  overflow-x: auto;
  overflow-y: hidden;
}

/* Syntax Highlighting - GitHub style */
.hljs {
  display: block;
  overflow-x: auto;
  color: #24292e;
  background: #f6f8fa;
}

.hljs-comment,
.hljs-quote {
  color: #6a737d;
  font-style: italic;
}

.hljs-keyword,
.hljs-selector-tag,
.hljs-subst {
  color: #d73a49;
}

.hljs-number,
.hljs-literal,
.hljs-variable,
.hljs-template-variable,
.hljs-tag .hljs-attr {
  color: #005cc5;
}

.hljs-string,
.hljs-doctag {
  color: #032f62;
}

.hljs-title,
.hljs-section,
.hljs-selector-id {
  color: #6f42c1;
  font-weight: bold;
}

.hljs-type,
.hljs-class .hljs-title {
  color: #6f42c1;
}

.hljs-tag,
.hljs-name,
.hljs-attribute {
  color: #22863a;
}

.hljs-regexp,
.hljs-link {
  color: #032f62;
}

.hljs-symbol,
.hljs-bullet {
  color: #e36209;
}

.hljs-built_in,
.hljs-builtin-name {
  color: #005cc5;
}

.hljs-meta {
  color: #6a737d;
  font-weight: bold;
}

.hljs-deletion {
  color: #b31d28;
  background-color: #ffeef0;
}

.hljs-addition {
  color: #22863a;
  background-color: #f0fff4;
}

.hljs-emphasis {
  font-style: italic;
}

.hljs-strong {
  font-weight: bold;
}

${hrStyles}
`;
}

function loadKatexCss(): string {
  // `rehype-katex` outputs KaTeX HTML that requires KaTeX CSS.
  // Without it, the MathML/annotation subtree becomes visible in print/PDF and looks like duplicated "source".
  const moduleDir = getModuleDir();
  const bundledKatexCssPath = path.join(moduleDir, 'vendor', 'katex', 'katex.min.css');

  let katexCssPath = bundledKatexCssPath;
  if (!fs.existsSync(bundledKatexCssPath)) {
    // Dev/monorepo fallback (root dependency).
    const require = createRequire(import.meta.url);
    katexCssPath = require.resolve('katex/dist/katex.min.css');
  }

  const katexDistDir = path.dirname(katexCssPath);
  const katexFontsHref = pathToFileURL(path.join(katexDistDir, 'fonts') + path.sep).href;

  let css = fs.readFileSync(katexCssPath, 'utf-8');
  // KaTeX CSS references fonts via `url(fonts/...)`. When inlined into the PDF HTML, those URLs become relative
  // to the temporary HTML file path, so we rewrite them to absolute file:// URLs.
  css = css.replace(/url\((['"]?)(?:\.\/)?fonts\//g, `url($1${katexFontsHref}`);
  return css;
}

/**
 * Node PDF Exporter Class
 */
export class NodePdfExporter {
  /**
   * Export markdown to PDF buffer
   */
  async exportToBuffer(markdown: string, options: Md2PdfOptions = {}): Promise<Buffer> {
    ensureBase64Globals();

    const themeId = options.theme || 'default';
    const basePath = options.basePath ?? process.cwd();
    const moduleDir = getModuleDir();

    const { platform } = createNodePlatform({
      moduleDir,
      selectedThemeId: themeId,
      output: { kind: 'buffer' },
    });

    const previousPlatform = (globalThis as any).platform;
    (globalThis as any).platform = platform;

    let browserRenderer: BrowserRenderer | null = null;
    try {
      browserRenderer = await createBrowserRenderer();
      if (!browserRenderer) {
        throw new Error('Failed to create browser renderer. Puppeteer is required for PDF export.');
      }
      await browserRenderer.initialize();

      const themeConfig = await loadRendererThemeConfig(themeId);

      const diagramMode: 'img' | 'live' | 'none' = options.diagramMode ?? 'img';
      let html = await markdownToHtmlFragment(markdown, browserRenderer, basePath, themeConfig, diagramMode, options.templatesDir, options.cdn);
      if (diagramMode === 'live') {
        const baseHref = pathToFileURL(basePath + path.sep).href;
        const md2xTemplateFiles = collectMd2xTemplateFiles(html, basePath, options.templatesDir);
        html = html + '\n' + buildLiveDiagramBootstrap(themeConfig ?? null, baseHref, options.cdn, md2xTemplateFiles, { mode: 'inline' });
      }

      // Load CSS
      let katexCss = '';
      try {
        katexCss = loadKatexCss();
      } catch (e) {
        console.warn('Failed to load KaTeX CSS for PDF export:', e);
      }
      const baseCss = await loadBaseCss(options.hrAsPageBreak ?? true);
      let themeCss = '';
      try {
        themeCss = await loadThemeCss(themeId);
      } catch (e) {
        console.warn('Failed to load theme CSS, using base styles only:', e);
      }
      // Order matters: KaTeX first, then our overrides/base, then theme.
      const css = katexCss + '\n' + baseCss + '\n' + themeCss;

      // Export to PDF
      return await browserRenderer.exportToPdf(html, css, options.pdf, basePath);
    } finally {
      try {
        if (browserRenderer) {
          await browserRenderer.close();
        }
      } finally {
        (globalThis as any).platform = previousPlatform;
      }
    }
  }

}

/**
 * Node Image Exporter Class
 *
 * Renders Markdown -> HTML -> full-page screenshot (PNG/JPEG/WebP).
 */
export class NodeImageExporter {
  async exportToBuffer(markdown: string, options: Md2ImageOptions = {}): Promise<Buffer> {
    ensureBase64Globals();

    const themeId = options.theme || 'default';
    const basePath = options.basePath ?? process.cwd();
    const moduleDir = getModuleDir();

    const { platform } = createNodePlatform({
      moduleDir,
      selectedThemeId: themeId,
      output: { kind: 'buffer' },
    });

    const previousPlatform = (globalThis as any).platform;
    (globalThis as any).platform = platform;

    let browserRenderer: BrowserRenderer | null = null;
    try {
      browserRenderer = await createBrowserRenderer();
      if (!browserRenderer) {
        throw new Error('Failed to create browser renderer. Puppeteer is required for image export.');
      }
      await browserRenderer.initialize();

      const themeConfig = await loadRendererThemeConfig(themeId);

      const diagramMode: 'img' | 'live' | 'none' = options.diagramMode ?? 'live';
      let html = await markdownToHtmlFragment(markdown, browserRenderer, basePath, themeConfig, diagramMode, options.templatesDir, options.cdn);
      if (diagramMode === 'live') {
        const baseHref = pathToFileURL(basePath + path.sep).href;
        const md2xTemplateFiles = collectMd2xTemplateFiles(html, basePath, options.templatesDir);
        html = html + '\n' + buildLiveDiagramBootstrap(themeConfig ?? null, baseHref, options.cdn, md2xTemplateFiles, { mode: 'inline' });
      }

      let katexCss = '';
      try {
        katexCss = loadKatexCss();
      } catch (e) {
        console.warn('Failed to load KaTeX CSS for image export:', e);
      }

      const baseCss = await loadBaseCss(options.hrAsPageBreak ?? false);

      let themeCss = '';
      try {
        themeCss = await loadThemeCss(themeId);
      } catch (e) {
        console.warn('Failed to load theme CSS, using base styles only:', e);
      }

      const css = katexCss + '\n' + baseCss + '\n' + themeCss;

      return await browserRenderer.exportToImage(html, css, options.image, basePath);
    } finally {
      try {
        if (browserRenderer) {
          await browserRenderer.close();
        }
      } finally {
        (globalThis as any).platform = previousPlatform;
      }
    }
  }

  async exportToBuffers(markdown: string, options: Md2ImageOptions = {}): Promise<Buffer[]> {
    ensureBase64Globals();

    const themeId = options.theme || 'default';
    const basePath = options.basePath ?? process.cwd();
    const moduleDir = getModuleDir();

    const { platform } = createNodePlatform({
      moduleDir,
      selectedThemeId: themeId,
      output: { kind: 'buffer' },
    });

    const previousPlatform = (globalThis as any).platform;
    (globalThis as any).platform = platform;

    let browserRenderer: BrowserRenderer | null = null;
    try {
      browserRenderer = await createBrowserRenderer();
      if (!browserRenderer) {
        throw new Error('Failed to create browser renderer. Puppeteer is required for image export.');
      }
      await browserRenderer.initialize();

      const themeConfig = await loadRendererThemeConfig(themeId);

      const diagramMode: 'img' | 'live' | 'none' = options.diagramMode ?? 'live';
      let html = await markdownToHtmlFragment(markdown, browserRenderer, basePath, themeConfig, diagramMode, options.templatesDir, options.cdn);
      if (diagramMode === 'live') {
        const baseHref = pathToFileURL(basePath + path.sep).href;
        const md2xTemplateFiles = collectMd2xTemplateFiles(html, basePath, options.templatesDir);
        html = html + '\n' + buildLiveDiagramBootstrap(themeConfig ?? null, baseHref, options.cdn, md2xTemplateFiles, { mode: 'inline' });
      }

      let katexCss = '';
      try {
        katexCss = loadKatexCss();
      } catch (e) {
        console.warn('Failed to load KaTeX CSS for image export:', e);
      }

      const baseCss = await loadBaseCss(options.hrAsPageBreak ?? false);

      let themeCss = '';
      try {
        themeCss = await loadThemeCss(themeId);
      } catch (e) {
        console.warn('Failed to load theme CSS, using base styles only:', e);
      }

      const css = katexCss + '\n' + baseCss + '\n' + themeCss;

      return await browserRenderer.exportToImageParts(html, css, options.image, basePath);
    } finally {
      try {
        if (browserRenderer) {
          await browserRenderer.close();
        }
      } finally {
        (globalThis as any).platform = previousPlatform;
      }
    }
  }
}

/**
 * Node HTML Exporter Class
 */
export class NodeHtmlExporter {
  /**
   * Export markdown to standalone HTML string (default) or HTML fragment.
   */
  async exportToString(markdown: string, options: Md2HtmlOptions = {}): Promise<string> {
    ensureBase64Globals();

    const themeId = options.theme || 'default';
    const basePath = options.basePath ?? process.cwd();
    const moduleDir = getModuleDir();
    const diagramMode: 'img' | 'live' | 'none' = options.diagramMode || 'live';

    const { platform } = createNodePlatform({
      moduleDir,
      selectedThemeId: themeId,
      output: { kind: 'buffer' },
    });

    const previousPlatform = (globalThis as any).platform;
    (globalThis as any).platform = platform;

    let browserRenderer: BrowserRenderer | null = null;
    try {
      const themeConfig = await loadRendererThemeConfig(themeId);

      if (diagramMode === 'img') {
        browserRenderer = await createBrowserRenderer();
        if (browserRenderer) {
          await browserRenderer.initialize();
        }
      }

      const fragment = await markdownToHtmlFragment(markdown, browserRenderer, basePath, themeConfig, diagramMode, options.templatesDir, options.cdn);

      const standalone = options.standalone !== false;
      if (!standalone) return fragment;

      let katexCss = '';
      try {
        katexCss = loadKatexCss();
      } catch (e) {
        console.warn('Failed to load KaTeX CSS for HTML export:', e);
      }

      const baseCss = await loadBaseCss(options.hrAsPageBreak ?? false);

      let themeCss = '';
      try {
        themeCss = await loadThemeCss(themeId);
      } catch (e) {
        console.warn('Failed to load theme CSS for HTML export, using base styles only:', e);
      }

      const css = katexCss + '\n' + baseCss + '\n' + themeCss;

      const title = options.title || 'Document';
      const shouldEmitBase = options.baseTag !== false && !!basePath;
      const baseHref = shouldEmitBase ? pathToFileURL(basePath + path.sep).href : '';
      const baseTag = baseHref ? `  <base href="${escapeHtmlText(baseHref)}" />\n` : '';

      // Reuse the same live bootstrap as image export so HTML and image captures behave consistently.
      const liveBootstrap = diagramMode === 'live'
        ? buildLiveDiagramBootstrap(
          themeConfig ?? null,
          baseHref,
          options.cdn,
          collectMd2xTemplateFiles(fragment, basePath, options.templatesDir),
          { mode: options.liveRuntime ?? 'cdn', url: options.liveRuntimeUrl },
          detectLiveRenderTypesFromHtml(fragment)
        )
        : '';

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${baseTag}  <title>${escapeHtmlText(title)}</title>
  <style>${css}</style>
</head>
<body>
  <div id="markdown-content" class="markdown-body">${fragment}</div>
${liveBootstrap}
</body>
</html>`;
    } finally {
      try {
        if (browserRenderer) {
          await browserRenderer.close();
        }
      } finally {
        (globalThis as any).platform = previousPlatform;
      }
    }
  }

  async exportToBuffer(markdown: string, options: Md2HtmlOptions = {}): Promise<Buffer> {
    const html = await this.exportToString(markdown, options);
    return Buffer.from(html, 'utf8');
  }
}

export default NodeDocxExporter;
