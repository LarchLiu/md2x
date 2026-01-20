import type { RendererThemeConfig } from '../../types/index';
import { SvgRenderer } from '../svg-renderer';

export class DomSvgRenderer extends SvgRenderer {
  async mountToDom(input: string | object, themeConfig: RendererThemeConfig | null, host: HTMLElement) {
    if (typeof input !== 'string') {
      throw new Error('SVG input must be a string');
    }
    const svg = input;
    this.validateInput(svg);
    host.innerHTML = svg;
    const root = (host.querySelector('svg') as unknown as HTMLElement | null) || host;
    return {
      root,
      cleanup: () => {
        try { host.innerHTML = ''; } catch {}
      },
    };
  }
}

