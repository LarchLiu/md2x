/**
 * Puppeteer Runtime Core (Browser)
 *
 * Runs inside `node/dist/renderer/puppeteer-render.html` and exposes globals that
 * `node/src/host/browser-renderer.ts` calls via `page.evaluate()`.
 *
 * This intentionally reuses the same renderer registry and DOM renderers as the
 * exported "live" runtime (chunked), to avoid shipping a separate large bundle.
 */

import { handleMountToDom, handleRender, initRenderEnvironment } from '../../../src/renderers/render-worker-core';
import { DirectFetchService, initServices } from '../../../src/renderers/worker/services';
import type { DomMountResult, RendererThemeConfig, RenderResult } from '../../../src/types/index';

declare global {
  interface Window {
    __md2xRenderReady?: boolean;
    __md2xSetBaseHref?: (href: string) => void;
    __md2xRender?: (
      renderType: string,
      input: string | object,
      themeConfig?: RendererThemeConfig | null
    ) => Promise<RenderResult>;
    __md2xRenderToDom?: (
      input: string | object,
      themeConfig?: RendererThemeConfig | null
    ) => Promise<string>;
    __md2xCleanupDom?: (id: string) => void;
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
  // Services used by some renderers (e.g. HtmlRenderer remote images)
  initServices({
    fetch: new DirectFetchService(),
  });

  const canvas = document.getElementById('png-canvas') as HTMLCanvasElement | null;
  initRenderEnvironment({ canvas: canvas ?? undefined });

  window.__md2xSetBaseHref = (href: string) => {
    const base = ensureBaseTag();
    base.href = href;
  };

  window.__md2xRender = async (
    renderType: string,
    input: string | object,
    themeConfig: RendererThemeConfig | null = null
  ): Promise<RenderResult> => {
    return await handleRender({ renderType, input, themeConfig });
  };

  const mounts = new Map<string, { host: HTMLElement; mounted: DomMountResult }>();
  const createId = (): string => `md2x-dom-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.__md2xRenderToDom = async (
    input: string | object,
    themeConfig: RendererThemeConfig | null = null
  ): Promise<string> => {
    const id = createId();

    const host = document.createElement('div');
    host.id = id;
    host.style.cssText =
      'position: absolute; left: 0; top: 0; display: inline-block; background: transparent; padding: 0; margin: 0;';
    document.body.appendChild(host);

    try {
      const mounted = await handleMountToDom({
        renderType: 'md2x',
        input,
        themeConfig,
        host,
      });

      // Best-effort: wait a couple of frames + fonts so layout settles before Puppeteer screenshots.
      try {
        if (typeof globalThis.requestAnimationFrame === 'function') {
          await new Promise<void>((r) => globalThis.requestAnimationFrame(() => r()));
          await new Promise<void>((r) => globalThis.requestAnimationFrame(() => r()));
        }
      } catch {}
      try {
        if ((document as any).fonts?.ready) {
          await (document as any).fonts.ready;
        }
      } catch {}

      mounts.set(id, { host, mounted });
      return id;
    } catch (e) {
      try { host.remove(); } catch {}
      throw e;
    }
  };

  window.__md2xCleanupDom = (id: string): void => {
    const entry = mounts.get(id);
    if (!entry) return;
    mounts.delete(id);
    try { entry.mounted.cleanup(); } catch {}
    try { entry.host.remove(); } catch {}
  };

  window.__md2xRenderReady = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

