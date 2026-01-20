import type { RendererThemeConfig } from '../../types/index';
import { sanitizeHtml } from '../../utils/html-sanitizer';
import { HtmlRenderer } from '../html-renderer';

export class DomHtmlRenderer extends HtmlRenderer {
  async mountToDom(input: string | object, themeConfig: RendererThemeConfig | null, host: HTMLElement) {
    if (typeof input !== 'string') {
      throw new Error('HTML input must be a string');
    }
    this.validateInput(input);

    const sanitizedHtml = sanitizeHtml(input);
    host.innerHTML = sanitizedHtml;

    return {
      root: host,
      cleanup: () => {
        try { host.innerHTML = ''; } catch {}
      },
    };
  }
}

