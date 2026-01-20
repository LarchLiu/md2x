/**
 * Live Runtime Core (Browser)
 *
 * A small runtime used by exported HTML in `diagramMode: "live"`.
 * Renderers are registered via separate renderer scripts (chunked build).
 */

import { handleMountToDom, hasRenderer, initRenderEnvironment } from '../../../src/renderers/render-worker-core';
import { DirectFetchService, initServices } from '../../../src/renderers/worker/services';
import type { RendererThemeConfig } from '../../../src/types/index';

declare global {
  interface Window {
    __md2xRenderReady?: boolean;
    __md2xLiveDone?: boolean;
    __md2xSetBaseHref?: (href: string) => void;
    __md2xRenderDocument?: (opts?: {
      baseHref?: string;
      themeConfig?: RendererThemeConfig | null;
      md2xTemplateFiles?: Record<string, string>;
      cdn?: any;
      rootSelector?: string;
    }) => Promise<void>;
  }
}

function ensureBaseTag(): HTMLBaseElement {
  let base = document.querySelector('base');
  if (!base) {
    base = document.createElement('base');
    document.head.appendChild(base);
  }
  return base as HTMLBaseElement;
}

function init(): void {
  initServices({
    fetch: new DirectFetchService(),
  });

  initRenderEnvironment({});

  window.__md2xSetBaseHref = (href: string) => {
    const base = ensureBaseTag();
    base.href = href;
  };

  const getLangFromCodeClass = (codeEl: Element): string => {
    const cls = (codeEl && (codeEl as any).className) ? String((codeEl as any).className) : '';
    const m = cls.match(/\blanguage-([a-z0-9-]+)\b/i);
    return m ? m[1] : '';
  };

  const normalizeLang = (lang: string): string => {
    const l = String(lang || '').toLowerCase();
    if (l === 'graphviz' || l === 'gv') return 'dot';
    if (l === 'vegalite') return 'vega-lite';
    return l;
  };

  const detectMd2xKind = (code: string): string => {
    const m = String(code || '').match(/\btype\s*:\s*['"]([a-z0-9-]+)['"]/i);
    const t = m ? String(m[1]).toLowerCase() : '';
    if (t === 'vue' || t === 'html' || t === 'svelte') return `md2x-${t}`;
    return 'md2x';
  };

  const replacePreWithContainer = (preEl: HTMLElement, kind: string): HTMLElement => {
    const wrapper = document.createElement('div');
    wrapper.className = 'md2x-diagram';
    wrapper.setAttribute('data-md2x-diagram-kind', kind);
    wrapper.style.maxWidth = '100%';

    const inner = document.createElement('div');
    inner.className = 'md2x-diagram-inner';
    inner.style.display = 'inline-block';
    inner.style.maxWidth = '100%';

    const mount = document.createElement('div');
    mount.className = 'md2x-diagram-mount';
    mount.style.maxWidth = '100%';

    inner.appendChild(mount);
    wrapper.appendChild(inner);
    preEl.replaceWith(wrapper);
    return mount;
  };

  window.__md2xRenderDocument = async (opts?: {
    baseHref?: string;
    themeConfig?: RendererThemeConfig | null;
    md2xTemplateFiles?: Record<string, string>;
    cdn?: any;
    rootSelector?: string;
  }): Promise<void> => {
    const o = opts || {};

    try { window.__md2xLiveDone = false; } catch {}

    try {
      if (o.baseHref && typeof window.__md2xSetBaseHref === 'function') {
        window.__md2xSetBaseHref(o.baseHref);
      }
    } catch {}

    const root = o.rootSelector ? document.querySelector(o.rootSelector) : document;
    if (!root) {
      try { window.__md2xLiveDone = true; } catch {}
      return;
    }

    const blocks = Array.from(root.querySelectorAll('pre > code'));

    for (const codeEl of blocks) {
      const pre = codeEl && codeEl.parentElement;
      if (!pre) continue;

      const langRaw = getLangFromCodeClass(codeEl);
      if (!langRaw) continue;
      const lang = normalizeLang(langRaw);
      if (!hasRenderer(lang)) continue;

      const code = (codeEl as HTMLElement).textContent ? String((codeEl as HTMLElement).textContent) : '';
      if (!code.trim()) continue;

      const kind = (lang === 'md2x') ? detectMd2xKind(code) : lang;
      const mount = replacePreWithContainer(pre as HTMLElement, kind);

      const input = (lang === 'md2x')
        ? ({ code, templateFiles: o.md2xTemplateFiles || {}, cdn: o.cdn } as any)
        : code;

      try {
        const mounted = await handleMountToDom({
          renderType: lang,
          input,
          themeConfig: o.themeConfig ?? null,
          host: mount,
        });
        try { await mounted.done; } catch {}
      } catch (e) {
        mount.textContent = (e && (e as any).message) ? String((e as any).message) : String(e);
      }
    }

    try {
      if ((document as any).fonts?.ready) {
        await (document as any).fonts.ready;
      }
    } catch {}

    try { window.__md2xLiveDone = true; } catch {}
  };

  window.__md2xRenderReady = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

