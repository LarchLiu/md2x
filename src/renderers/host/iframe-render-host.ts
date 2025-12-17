import type { RenderHost } from './render-host';

import { RenderChannel } from '../../messaging/channels/render-channel';
import { WindowPostMessageTransport } from '../../messaging/transports/window-postmessage-transport';

export type IframeRenderHostOptions = {
  iframeUrl: string;
  source: string;
  timeoutMs?: number;
  readyTimeoutMs?: number;
};

export class IframeRenderHost implements RenderHost {
  private iframe: HTMLIFrameElement | null = null;
  private readyPromise: Promise<void> | null = null;
  private renderChannel: RenderChannel | null = null;

  private readonly iframeUrl: string;
  private readonly source: string;
  private readonly timeoutMs: number;
  private readonly readyTimeoutMs: number;

  constructor(options: IframeRenderHostOptions) {
    this.iframeUrl = options.iframeUrl;
    this.source = options.source;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.readyTimeoutMs = options.readyTimeoutMs ?? 15_000;
  }

  private ensureIframeCreated(): HTMLIFrameElement {
    if (this.iframe) {
      return this.iframe;
    }

    const iframe = document.createElement('iframe');
    iframe.src = this.iframeUrl;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.position = 'fixed';
    iframe.style.left = '-99999px';
    iframe.style.top = '-99999px';
    iframe.style.width = '10px';
    iframe.style.height = '10px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';

    (document.documentElement || document.body).appendChild(iframe);
    this.iframe = iframe;
    return iframe;
  }

  private getOrCreateRenderChannel(): RenderChannel {
    const iframe = this.ensureIframeCreated();
    const targetWindow = iframe.contentWindow;
    if (!targetWindow) {
      throw new Error('Render frame not available');
    }

    if (!this.renderChannel) {
      this.renderChannel = new RenderChannel(
        new WindowPostMessageTransport(targetWindow, {
          targetOrigin: '*',
          acceptSource: targetWindow,
        }),
        {
          source: this.source,
          timeoutMs: this.timeoutMs,
        }
      );
    }

    return this.renderChannel;
  }

  async ensureReady(): Promise<void> {
    const iframe = this.ensureIframeCreated();
    const targetWindow = iframe.contentWindow;
    if (!targetWindow) {
      throw new Error('Render frame not available');
    }

    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = new Promise((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        if (event.source !== targetWindow) {
          return;
        }

        const data = event.data as { type?: unknown } | null;
        if (data && data.type === 'RENDER_FRAME_READY') {
          try {
            targetWindow.postMessage({ type: 'READY_ACK' }, '*');
          } catch {
            // Ignore
          }

          window.removeEventListener('message', onMessage);
          resolve();
        }
      };

      window.addEventListener('message', onMessage);

      setTimeout(() => {
        window.removeEventListener('message', onMessage);
        reject(new Error('Render frame load timeout'));
      }, this.readyTimeoutMs);
    });

    return this.readyPromise;
  }

  async send<T = unknown>(type: string, payload: unknown, timeoutMs?: number): Promise<T> {
    await this.ensureReady();
    const channel = this.getOrCreateRenderChannel();
    return (await channel.send(type, payload, { timeoutMs: timeoutMs ?? this.timeoutMs })) as T;
  }

  async cleanup(): Promise<void> {
    this.renderChannel?.close();
    this.renderChannel = null;
    this.readyPromise = null;

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }
    this.iframe = null;
  }
}
