// Render Host
// Abstraction for where/how diagram rendering is executed (offscreen/iframe/inpage/runtime).

export interface RenderHost {
  ensureReady(): Promise<void>;

  send<T = unknown>(type: string, payload: unknown, timeoutMs?: number): Promise<T>;

  cleanup?(): Promise<void>;
}
