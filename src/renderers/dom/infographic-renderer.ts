import { Infographic, setDefaultFont } from '@antv/infographic';
import type { RendererThemeConfig } from '../../types/index';
import { InfographicRenderer } from '../infographic-renderer';

const DEFAULT_FONT_FAMILY = "'SimSun', 'Times New Roman', Times, serif";

export class DomInfographicRenderer extends InfographicRenderer {
  async mountToDom(input: string | object, themeConfig: RendererThemeConfig | null, host: HTMLElement) {
    if (!this._initialized) {
      await this.initialize(themeConfig);
    }

    const fontFamily = themeConfig?.fontFamily || DEFAULT_FONT_FAMILY;
    setDefaultFont(fontFamily);

    if (typeof input !== 'string') {
      throw new Error('Infographic input must be a string');
    }
    const code = input;
    this.validateInput(code);

    host.innerHTML = '';

    const isHandDrawn = themeConfig?.diagramStyle === 'handDrawn';

    const infographicOptions: {
      container: HTMLElement;
      width: number;
      height: number;
      padding: number;
      themeConfig?: {
        stylize: {
          type: 'rough';
          roughness: number;
          bowing: number;
        };
      };
    } = {
      container: host,
      width: 900,
      height: 600,
      padding: 24,
    };

    if (isHandDrawn) {
      infographicOptions.themeConfig = {
        stylize: {
          type: 'rough',
          roughness: 0.5,
          bowing: 0.5,
        },
      };
    }

    const infographic = new Infographic(infographicOptions);

    const done = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Infographic render timeout after 10s')), 10000);
      infographic.on('rendered', () => {
        clearTimeout(timeout);
        resolve();
      });
      infographic.on('error', (err: unknown) => {
        clearTimeout(timeout);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
      try {
        infographic.render(code);
      } catch (e) {
        clearTimeout(timeout);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    await done.catch(() => {
      // keep whatever output the library produced
    });

    return {
      root: host,
      cleanup: () => {
        try { infographic.destroy(); } catch {}
        try { host.innerHTML = ''; } catch {}
      },
      done,
    };
  }
}

