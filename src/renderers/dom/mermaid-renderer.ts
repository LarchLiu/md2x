import type { RendererThemeConfig } from '../../types/index';
import { MermaidRenderer } from '../mermaid-renderer';

// Mermaid is a special case: it requires window.mermaid global.
type MermaidAPI = {
  render: (id: string, code: string) => Promise<{ svg: string }>;
};

function getMermaid(): MermaidAPI {
  const mermaid = (window as unknown as { mermaid?: MermaidAPI }).mermaid;
  if (!mermaid) {
    throw new Error('Mermaid library not loaded.');
  }
  return mermaid;
}

export class DomMermaidRenderer extends MermaidRenderer {
  async mountToDom(input: string | object, themeConfig: RendererThemeConfig | null, host: HTMLElement) {
    if (!this._initialized) {
      await this.initialize(themeConfig);
    }

    if (typeof input !== 'string') {
      throw new Error('Mermaid input must be a string');
    }
    const code = input;
    this.validateInput(code);

    const preprocessed = this.preprocessCode(code);
    this.applyThemeConfig(themeConfig);

    const diagramId = 'mermaid-diagram-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const { svg } = await getMermaid().render(diagramId, preprocessed);

    const processedSvg = this.isSequenceDiagram(preprocessed) ? this.applyRoughEffectToSvg(svg, themeConfig) : svg;
    host.innerHTML = processedSvg;

    const svgEl = host.querySelector('svg') as unknown as HTMLElement | null;
    const root = svgEl || host;

    const done = (async () => {
      try {
        if ((document as any).fonts?.ready) {
          await (document as any).fonts.ready;
        }
      } catch {}
      try {
        if (typeof globalThis.requestAnimationFrame === 'function') {
          await new Promise<void>((r) => globalThis.requestAnimationFrame(() => r()));
          await new Promise<void>((r) => globalThis.requestAnimationFrame(() => r()));
        }
      } catch {}
    })();

    return {
      root,
      cleanup: () => {
        try { host.innerHTML = ''; } catch {}
      },
      done,
    };
  }
}

