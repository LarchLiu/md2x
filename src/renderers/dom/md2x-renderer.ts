import type { RendererThemeConfig } from '../../types/index';
import {
  Md2xRenderer,
  type Md2xDomMountResult,
  type Md2xRenderInput,
  parseMd2xTemplateConfig,
  extractTemplateConfigFromHead,
  injectTemplateData,
  loadTemplateAssets,
  dynamicImport,
  normalizePkgEntryUrl,
  rewriteSvelteModuleSpecifiers,
} from '../md2x-renderer';

export class DomMd2xRenderer extends Md2xRenderer {
  async mountToDom(
    input: Md2xRenderInput,
    themeConfig: RendererThemeConfig | null,
    container?: HTMLElement
  ): Promise<Md2xDomMountResult> {
    const raw = typeof input === 'string' ? input : input.code;
    this.validateInput(raw);

    const cfg = parseMd2xTemplateConfig(raw);
    const templateFiles = typeof input === 'string' ? undefined : input.templateFiles;
    const cdn = typeof input === 'string' ? undefined : input.cdn;

    const { templateRef, source } = this.getTemplateSource(templateFiles, cfg.type, cfg.template);
    if (!source) {
      const root = document.createElement('div');
      root.textContent = `Missing md2x template: ${templateRef || cfg.template}`;
      return { root, cleanup: () => {} };
    }

    const extracted = extractTemplateConfigFromHead(source);
    if (cfg.allowTemplateAssets) {
      if (extracted.error) {
        const root = document.createElement('div');
        root.textContent = `Invalid TemplateConfig JSON: ${extracted.error}`;
        return { root, cleanup: () => {} };
      }
      await loadTemplateAssets(extracted.templateConfig);
    }

    const host =
      container ??
      (() => {
        const el = document.createElement('div');
        el.style.cssText = 'position: absolute; left: 0; top: 0; display: inline-block; background: transparent; padding: 0; margin: 0;';
        document.body.appendChild(el);
        return el;
      })();

    try { host.innerHTML = ''; } catch {}

    if (cfg.type === 'html') {
      const mount = document.createElement('div');
      mount.style.cssText = 'display: inline-block;';
      host.appendChild(mount);

      const injected = injectTemplateData(extracted.source, cfg.data);
      mount.innerHTML = injected;

      const cleanup = () => {
        try { mount.remove(); } catch {}
        if (!container) this.removeContainer(host);
      };

      if (cfg.allowScripts) {
        await this.runHtmlTemplateScripts(mount, templateFiles);
      }

      return { root: host, cleanup };
    }

    if (cfg.type === 'vue') {
      try {
        await this.ensureVueRuntime(cdn);
      } catch (e) {
        const root = document.createElement('div');
        root.textContent = `Vue runtime unavailable: ${(e as Error).message}`;
        return { root, cleanup: () => {} };
      }

      const Vue = (globalThis as any).Vue as any;
      const loader = (globalThis as any)['vue3-sfc-loader'] as any;
      if (!Vue || !loader || typeof loader.loadModule !== 'function') {
        const root = document.createElement('div');
        root.textContent = 'Vue runtime not available (missing Vue / vue3-sfc-loader)';
        return { root, cleanup: () => {} };
      }

      const styles: string[] = [];
      const patchedSfc = injectTemplateData(extracted.source, cfg.data);
      const sfcKey = templateRef || cfg.template;

      const options = {
        moduleCache: { vue: Vue },
        getFile: async (url: string) => {
          if (url === sfcKey || url.endsWith('/' + sfcKey) || url.endsWith('\\' + sfcKey)) return patchedSfc;
          const files = templateFiles ?? {};
          if (typeof files[url] === 'string') return files[url];
          try {
            const abs = new URL(url, document.baseURI).href;
            if (typeof files[abs] === 'string') return files[abs];
          } catch {}
          return null;
        },
        addStyle: (textContent: string) => {
          if (typeof textContent === 'string' && textContent.trim()) {
            styles.push(textContent);
          }
        },
      };

      const mount = document.createElement('div');
      mount.style.cssText = 'display: inline-block;';
      host.appendChild(mount);

      let app: any = null;
      let styleEl: HTMLStyleElement | null = null;
      try {
        const component = await loader.loadModule(sfcKey, options);
        app = Vue.createApp({ render: () => Vue.h(component) });
        app.mount(mount);
        try { await Vue.nextTick(); } catch {}
        try { if ((document as any).fonts?.ready) await (document as any).fonts.ready; } catch {}

        if (styles.length) {
          styleEl = document.createElement('style');
          styleEl.textContent = styles.join('\n');
          document.head.appendChild(styleEl);
        }
      } catch (e) {
        try { mount.textContent = `Failed to mount Vue template: ${(e as Error).message}`; } catch {}
      }

      const cleanup = () => {
        try { if (app && typeof app.unmount === 'function') app.unmount(); } catch {}
        try { mount.remove(); } catch {}
        try { if (styleEl) styleEl.remove(); } catch {}
        if (!container) this.removeContainer(host);
      };

      return { root: host, cleanup };
    }

    if (cfg.type === 'svelte') {
      let compilerMod: any;
      try {
        compilerMod = await this.ensureSvelteCompiler(cdn);
      } catch (e) {
        const root = document.createElement('div');
        root.textContent = `Svelte compiler unavailable: ${(e as Error).message}`;
        return { root, cleanup: () => {} };
      }

      const compileFn =
        (compilerMod as any)?.compile ||
        (compilerMod as any)?.default?.compile ||
        (compilerMod as any)?.svelte?.compile;
      if (typeof compileFn !== 'function') {
        const root = document.createElement('div');
        root.textContent = 'Svelte compiler not available (missing compile())';
        return { root, cleanup: () => {} };
      }

      const patched = injectTemplateData(extracted.source, cfg.data);

      let compiled: any;
      try {
        try {
          compiled = compileFn(patched, { filename: templateRef || cfg.template || 'md2x.svelte', generate: 'client' });
        } catch {
          compiled = compileFn(patched, { filename: templateRef || cfg.template || 'md2x.svelte', generate: 'dom' });
        }
      } catch (e) {
        const root = document.createElement('div');
        root.textContent = `Failed to compile Svelte template: ${(e as Error).message}`;
        return { root, cleanup: () => {} };
      }

      const jsCode = String(compiled?.js?.code || '');
      const cssCode = String(compiled?.css?.code || '');
      if (!jsCode.trim()) {
        const root = document.createElement('div');
        root.textContent = 'Svelte compile returned no JS output';
        return { root, cleanup: () => {} };
      }

      const svelteBase = cdn?.svelteBase || 'https://esm.sh/svelte@5/';
      const moduleCode = rewriteSvelteModuleSpecifiers(jsCode, svelteBase);

      const mount = document.createElement('div');
      mount.style.cssText = 'display: inline-block;';
      host.appendChild(mount);

      let instance: any = null;
      let unmountFn: ((inst: any) => void) | null = null;
      let blobUrl: string | null = null;
      let styleEl: HTMLStyleElement | null = null;

      try {
        blobUrl = URL.createObjectURL(new Blob([moduleCode], { type: 'text/javascript' }));
        const mod = await dynamicImport(blobUrl);
        const Comp = (mod as any)?.default;
        if (typeof Comp !== 'function') throw new Error('Compiled Svelte module has no default component export');

        const runtime = await dynamicImport(normalizePkgEntryUrl(svelteBase));
        const mountFn = (runtime as any)?.mount;
        unmountFn = typeof (runtime as any)?.unmount === 'function' ? (runtime as any).unmount : null;
        if (typeof mountFn !== 'function') throw new Error('Svelte runtime mount() not available');
        instance = mountFn(Comp, { target: mount });

        if (cssCode.trim()) {
          styleEl = document.createElement('style');
          styleEl.textContent = cssCode;
          document.head.appendChild(styleEl);
        }
      } catch (e) {
        try { mount.textContent = `Failed to mount Svelte template: ${(e as Error).message}`; } catch {}
      }

      const cleanup = () => {
        try { if (instance && unmountFn) unmountFn(instance); } catch {}
        try { if (blobUrl) URL.revokeObjectURL(blobUrl); } catch {}
        try { mount.remove(); } catch {}
        try { if (styleEl) styleEl.remove(); } catch {}
        if (!container) this.removeContainer(host);
      };

      return { root: host, cleanup };
    }

    const root = document.createElement('div');
    root.textContent = `Unsupported md2x type: ${(cfg as any).type}`;
    return { root, cleanup: () => {} };
  }
}

