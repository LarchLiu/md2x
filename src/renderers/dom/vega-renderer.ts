import embed from 'vega-embed';
import { expressionInterpreter } from 'vega-interpreter';
import type { RendererThemeConfig } from '../../types/index';
import { VegaRenderer } from '../vega-renderer';

export class DomVegaRenderer extends VegaRenderer {
  async mountToDom(vegaSpec: string | any, themeConfig: RendererThemeConfig | null, host: HTMLElement) {
    if (!this._initialized) {
      await this.initialize(themeConfig);
    }

    this.validateInput(vegaSpec);
    const processedSpec = this.preprocessInput(vegaSpec);

    const fontFamily = themeConfig?.fontFamily || "'SimSun', 'Times New Roman', Times, serif";

    // Reset host (caller owns it, so we just clear children).
    host.innerHTML = '';

    const container = document.createElement('div');
    container.style.cssText = 'display: inline-block; background: transparent; padding: 0; margin: 0;';
    host.appendChild(container);

    const mode = (this.type === 'vega' ? 'vega' : 'vega-lite') as 'vega' | 'vega-lite';

    const embedOptions = {
      mode,
      actions: false,
      renderer: 'svg' as const,
      ast: true,
      expr: expressionInterpreter,
      config: {
        background: null as string | null,
        font: fontFamily,
        view: {
          stroke: null as string | null,
        },
        axis: {
          labelFontSize: 11,
          titleFontSize: 12,
        },
        legend: {
          labelFontSize: 11,
          titleFontSize: 12,
        },
        mark: {
          tooltip: true,
        },
      },
    };

    const result = await embed(container, processedSpec, embedOptions);

    const done = (async () => {
      try {
        if (result?.view?.runAsync) {
          await result.view.runAsync();
        }
      } catch {}
      try {
        if ((document as any).fonts?.ready) {
          await (document as any).fonts.ready;
        }
      } catch {}
    })();

    return {
      root: container,
      cleanup: () => {
        try { result?.view?.finalize?.(); } catch {}
        try { container.remove(); } catch {}
      },
      done,
    };
  }
}

