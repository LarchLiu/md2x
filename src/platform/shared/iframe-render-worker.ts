import { RenderChannel } from '../../messaging/channels/render-channel';
import { WindowPostMessageTransport } from '../../messaging/transports/window-postmessage-transport';

import { bootstrapRenderWorker } from '../../renderers/worker/worker-bootstrap';
import { MessageTypes } from '../../renderers/render-worker-core';

export type IframeRenderWorkerOptions = {
  source: string;
  timeoutMs?: number;
  readyIntervalMs?: number;
  readyStopAfterMs?: number;
  enableDebugLogToParent?: boolean;
};

type ReadyAckMessage = {
  type?: string;
};

type LogMessage = {
  type: 'RENDER_FRAME_LOG';
  args?: string[];
};

function logToParent(enabled: boolean, ...args: unknown[]): void {
  if (!enabled) return;

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'RENDER_FRAME_LOG',
          args: args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))),
        } satisfies LogMessage,
        '*'
      );
    }
  } catch {
    // Ignore
  }
}

export function startIframeRenderWorker(options: IframeRenderWorkerOptions): void {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const readyIntervalMs = options.readyIntervalMs ?? 100;
  const readyStopAfterMs = options.readyStopAfterMs ?? 10_000;
  const enableDebugLogToParent = options.enableDebugLogToParent ?? false;

  let isReady = false;
  let readyAcknowledged = false;
  let readyInterval: ReturnType<typeof setInterval> | null = null;

  const renderChannel = new RenderChannel(
    new WindowPostMessageTransport(window.parent, {
      targetOrigin: '*',
      acceptSource: window.parent,
    }),
    {
      source: options.source,
      timeoutMs,
    }
  );

  const worker = bootstrapRenderWorker(renderChannel, {
    getCanvas: () => document.getElementById('png-canvas') as HTMLCanvasElement | null,
    getReady: () => isReady,
  });

  window.addEventListener('message', (event: MessageEvent<ReadyAckMessage>) => {
    const message = event.data;
    if (message && (message.type === MessageTypes.READY_ACK || message.type === 'READY_ACK')) {
      readyAcknowledged = true;
      if (readyInterval) {
        clearInterval(readyInterval);
        readyInterval = null;
      }
    }
  });

  const sendReady = (): void => {
    if (readyAcknowledged) {
      return;
    }

    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'RENDER_FRAME_READY' }, '*');
      }
    } catch {
      // Ignore
    }
  };

  const initialize = (): void => {
    worker.init();
    isReady = true;

    logToParent(enableDebugLogToParent, 'Render frame initialized');

    sendReady();
    readyInterval = setInterval(sendReady, readyIntervalMs);

    setTimeout(() => {
      if (readyInterval) {
        clearInterval(readyInterval);
        readyInterval = null;
      }
    }, readyStopAfterMs);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
}
