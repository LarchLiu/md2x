// Render Worker Protocol
// Shared request/response payload typings for render worker communication.

import type { RendererThemeConfig, RenderResult } from '../../types/index';

export const RenderWorkerMessageTypes = {
  RENDER_DIAGRAM: 'RENDER_DIAGRAM',
  SET_THEME_CONFIG: 'SET_THEME_CONFIG',
  PING: 'PING',

  // Lifecycle
  READY: 'READY',
  READY_ACK: 'READY_ACK',
} as const;

export type RenderWorkerMessageType =
  typeof RenderWorkerMessageTypes[keyof typeof RenderWorkerMessageTypes];

export type SetThemeConfigPayload = {
  config: RendererThemeConfig;
};

export type RenderDiagramPayload = {
  renderType: string;
  input: string | object;
  themeConfig?: RendererThemeConfig | null;
  extraParams?: Record<string, unknown>;
};

export type PingPayload = Record<string, never>;

export type PingResponse = {
  ready: boolean;
};

export type RenderWorkerPayloadMap = {
  SET_THEME_CONFIG: SetThemeConfigPayload;
  RENDER_DIAGRAM: RenderDiagramPayload;
  PING: PingPayload;
};

export type RenderWorkerResponseMap = {
  SET_THEME_CONFIG: Record<string, never>;
  RENDER_DIAGRAM: RenderResult;
  PING: PingResponse;
};
