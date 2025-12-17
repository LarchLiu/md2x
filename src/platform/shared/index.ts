/**
 * Platform Shared Module
 * 
 * Exports common base classes and utilities shared across all platforms.
 */

export {
  BaseCacheService,
  BaseI18nService,
  BaseRendererService,
  DEFAULT_SETTING_LOCALE,
  FALLBACK_LOCALE
} from './base-services';

export type {
  LocaleMessages,
  LocaleMessageEntry
} from './base-services';

// Re-export types from unified type system
export type {
  RendererThemeConfig,
  RenderResult,
  RenderOptions,
  CacheStats,
  SimpleCacheStats
} from '../../types/index';

export {
  startIframeRenderWorker,
} from './iframe-render-worker';

// Note: Render worker related code is in src/renderers/:
// - worker/worker-bootstrap.ts  - Shared worker bootstrap
// - host/iframe-render-host.ts  - Shared iframe host
// - platform/shared/iframe-render-worker.ts - Shared iframe worker runtime

