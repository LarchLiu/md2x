import JSONCanvas from '@trbn/jsoncanvas';
import type { RendererThemeConfig } from '../../types/index';
import { applyRoughEffect } from '../libs/rough-svg';
import { JsonCanvasRenderer } from '../canvas-renderer';

export class DomJsonCanvasRenderer extends JsonCanvasRenderer {
  async mountToDom(input: string | object, themeConfig: RendererThemeConfig | null, host: HTMLElement) {
    if (!this._initialized) {
      await this.initialize(themeConfig);
    }

    if (typeof input !== 'string') {
      throw new Error('JSON Canvas input must be a string');
    }
    const jsonStr = input;
    this.validateInput(jsonStr);

    let canvas;
    try {
      canvas = JSONCanvas.fromString(jsonStr);
    } catch (e) {
      throw new Error(`Invalid JSON Canvas format: ${e instanceof Error ? e.message : String(e)}`);
    }

    const fontFamily = themeConfig?.fontFamily || "'SimSun', 'Times New Roman', Times, serif";

    let svgContent = this.generateSvg(canvas, fontFamily);

    const isHandDrawn = themeConfig?.diagramStyle === 'handDrawn';
    if (isHandDrawn) {
      svgContent = applyRoughEffect(svgContent, this.roughOptions);
    }

    host.innerHTML = svgContent;

    const root = (host.querySelector('svg') as unknown as HTMLElement | null) || host;
    return {
      root,
      cleanup: () => {
        try { host.innerHTML = ''; } catch {}
      },
    };
  }
}

