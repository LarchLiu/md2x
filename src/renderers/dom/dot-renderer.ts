import type { RendererThemeConfig } from '../../types/index';
import { applyRoughEffect } from '../libs/rough-svg';
import { DotRenderer } from '../dot-renderer';

export class DomDotRenderer extends DotRenderer {
  async mountToDom(input: string | object, themeConfig: RendererThemeConfig | null, host: HTMLElement) {
    if (!this._initialized || !this.viz) {
      await this.initialize(themeConfig);
    }

    if (typeof input !== 'string') {
      throw new Error('DOT input must be a string');
    }
    const code = input;
    this.validateInput(code);

    const svgEl = this.viz!.renderSVGElement(code, {
      graphAttributes: {
        bgcolor: 'transparent',
      },
    });

    let svgString = new XMLSerializer().serializeToString(svgEl);

    const isHandDrawn = themeConfig?.diagramStyle === 'handDrawn';
    if (isHandDrawn) {
      svgString = applyRoughEffect(svgString, this.roughOptions);
    }

    host.innerHTML = svgString;

    const root = (host.querySelector('svg') as unknown as HTMLElement | null) || host;
    return {
      root,
      cleanup: () => {
        try { host.innerHTML = ''; } catch {}
      },
    };
  }
}

