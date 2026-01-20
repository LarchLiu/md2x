import type { BaseRenderer } from './base-renderer';

type RegistryGlobal = typeof globalThis & {
  __md2x_renderer_registry__?: Map<string, BaseRenderer>;
};

function getGlobal(): RegistryGlobal {
  return globalThis as RegistryGlobal;
}

function ensureRegistry(): Map<string, BaseRenderer> {
  const g = getGlobal();
  if (!g.__md2x_renderer_registry__) {
    g.__md2x_renderer_registry__ = new Map<string, BaseRenderer>();
  }
  return g.__md2x_renderer_registry__;
}

export function registerRenderer(renderer: BaseRenderer): void {
  const m = ensureRegistry();
  m.set(renderer.type, renderer);
}

export function getRenderer(type: string): BaseRenderer | undefined {
  return ensureRegistry().get(type);
}

export function hasRenderer(type: string): boolean {
  return ensureRegistry().has(type);
}

export function getRegisteredRendererTypes(): string[] {
  return Array.from(ensureRegistry().keys());
}

