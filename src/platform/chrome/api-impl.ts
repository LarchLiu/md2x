/**
 * Chrome Platform API Implementation
 * 
 * Implements the platform interface for Chrome Extension environment.
 */

import {
  BaseCacheService,
  BaseI18nService,
  BaseRendererService,
  DEFAULT_SETTING_LOCALE,
  FALLBACK_LOCALE
} from '../shared/index';

import type {
  LocaleMessages
} from '../shared/index';

import type {
  RendererThemeConfig,
  RenderResult,
  RenderOptions,
  CacheStats,
  SimpleCacheStats
} from '../../types/index';

import type { RenderHost } from '../../renderers/host/render-host';
import { IframeRenderHost } from '../../renderers/host/iframe-render-host';
import { OffscreenRenderHost } from './hosts/offscreen-render-host';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Storage keys type
 */
type StorageKeys = string | string[] | Record<string, unknown>;

/**
 * Chrome download options
 */
interface DownloadOptions {
  saveAs?: boolean;
}

/**
 * Message handler function type
 */
type MessageHandler = (
  message: unknown,
  sender: chrome.runtime.MessageSender
) => void | Promise<unknown>;

type ResponseEnvelopeLike = {
  type: 'RESPONSE';
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: { message?: string };
};

function isResponseEnvelopeLike(message: unknown): message is ResponseEnvelopeLike {
  if (!message || typeof message !== 'object') return false;
  const obj = message as Record<string, unknown>;
  return obj.type === 'RESPONSE' && typeof obj.requestId === 'string' && typeof obj.ok === 'boolean';
}

// ============================================================================
// Chrome Storage Service
// ============================================================================

export class ChromeStorageService {
  async get(keys: StorageKeys): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result || {});
      });
    });
  }

  async set(data: Record<string, unknown>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  }

  async remove(keys: string | string[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => {
        resolve();
      });
    });
  }
}

// ============================================================================
// Chrome File Service
// ============================================================================

export class ChromeFileService {
  async download(blob: Blob, filename: string, options: DownloadOptions = {}): Promise<void> {
    const url = URL.createObjectURL(blob);
    try {
      await chrome.downloads.download({
        url,
        filename,
        saveAs: options.saveAs !== false
      });
    } finally {
      // Delay revoke to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

// ============================================================================
// Chrome Resource Service
// ============================================================================

export class ChromeResourceService {
  getURL(path: string): string {
    return chrome.runtime.getURL(path);
  }

  /**
   * Fetch asset content
   * @param path - Asset path relative to extension root
   * @returns Asset content as string
   */
  async fetch(path: string): Promise<string> {
    const url = this.getURL(path);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.text();
  }
}

// ============================================================================
// Chrome Message Service
// ============================================================================

export class ChromeMessageService {
  private requestCounter = 0;

  private createRequestId(): string {
    this.requestCounter += 1;
    return `${Date.now()}-${this.requestCounter}`;
  }

  send(message: unknown, timeout: number = 300000): Promise<ResponseEnvelopeLike> {
    return new Promise((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        reject(new Error('Message timeout after 5 minutes'));
      }, timeout);

      chrome.runtime.sendMessage(message, (response: unknown) => {
        clearTimeout(timeoutTimer);

        if (chrome.runtime.lastError) {
          reject(new Error(`Runtime error: ${chrome.runtime.lastError.message}`));
          return;
        }

        if (response === undefined) {
          reject(new Error('No response received from background script'));
          return;
        }

        // Envelope-only: background must respond with ResponseEnvelope.
        if (isResponseEnvelopeLike(response)) {
          resolve(response);
          return;
        }

        reject(new Error('Unexpected response type (expected ResponseEnvelope)'));
      });
    });
  }

  /**
   * Preferred: send a unified RequestEnvelope.
   */
  sendEnvelope(type: string, payload: unknown, timeout: number = 300000, source = 'chrome-platform'): Promise<ResponseEnvelopeLike> {
    return this.send(
      {
        id: this.createRequestId(),
        type,
        payload,
        timestamp: Date.now(),
        source,
      },
      timeout
    );
  }

  addListener(handler: (message: unknown) => void): void {
    chrome.runtime.onMessage.addListener((message) => {
      // Event-only listener: envelope RPC is handled via send/sendEnvelope.
      handler(message);
      return false;
    });
  }
}

// ============================================================================
// Chrome Cache Service (Proxy to Background)
// Extends BaseCacheService for common hash/key generation
// ============================================================================

export class ChromeCacheService extends BaseCacheService {
  private messageService: ChromeMessageService;

  constructor(messageService: ChromeMessageService) {
    super();
    this.messageService = messageService;
  }

  async init(): Promise<void> {
    // No initialization needed, background handles it
  }

  async ensureDB(): Promise<void> {
    // No initialization needed, background handles it
  }

  async get(key: string): Promise<unknown> {
    try {
      const response = await this.messageService.sendEnvelope('CACHE_OPERATION', {
        operation: 'get',
        key,
      });
      if (!response.ok) {
        return null;
      }
      return response.data ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, type: string = 'unknown'): Promise<boolean> {
    try {
      const response = await this.messageService.sendEnvelope('CACHE_OPERATION', {
        operation: 'set',
        key,
        value,
        dataType: type,
      });
      if (!response.ok) return false;
      const data = response.data;
      if (data && typeof data === 'object' && (data as { success?: unknown }).success === false) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      const response = await this.messageService.sendEnvelope('CACHE_OPERATION', {
        operation: 'clear',
      });
      if (!response.ok) return false;
      const data = response.data;
      if (data && typeof data === 'object' && (data as { success?: unknown }).success === false) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<CacheStats | SimpleCacheStats | null> {
    try {
      const response = await this.messageService.sendEnvelope('CACHE_OPERATION', {
        operation: 'getStats',
      });
      if (!response.ok) return null;
      return (response.data as CacheStats | SimpleCacheStats) || null;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Chrome Renderer Service
// Extends BaseRendererService for common theme config handling
// ============================================================================

type ChromeRenderHostType = 'offscreen' | 'iframe';

const DEFAULT_CHROME_RENDER_HOST_TYPE: ChromeRenderHostType = 'offscreen';

function normalizeChromeRenderHostType(value: unknown): ChromeRenderHostType | null {
  if (value === 'iframe') return 'iframe';
  if (value === 'offscreen') return 'offscreen';
  return null;
}

export class ChromeRendererService extends BaseRendererService {
  private messageService: ChromeMessageService;
  private hostType: ChromeRenderHostType = DEFAULT_CHROME_RENDER_HOST_TYPE;
  private offscreenHost: RenderHost | null = null;
  private iframeHost: RenderHost | null = null;
  private themeDirty = false;
  private cache: ChromeCacheService;

  constructor(messageService: ChromeMessageService, cacheService: ChromeCacheService) {
    super();
    this.messageService = messageService;
    this.cache = cacheService;
  }

  async init(): Promise<void> {
    // Renderer initialization handled by background/offscreen
  }

  private async getHost(): Promise<RenderHost> {
    const override = normalizeChromeRenderHostType(
      (globalThis as unknown as { __markdownViewerChromeRenderHost?: unknown }).__markdownViewerChromeRenderHost
    );

    this.hostType = override || DEFAULT_CHROME_RENDER_HOST_TYPE;

    if (this.hostType === 'iframe') {
      if (!this.iframeHost) {
        const iframeUrl = chrome.runtime.getURL('ui/iframe-render.html');
        this.iframeHost = new IframeRenderHost({
          iframeUrl,
          source: 'chrome-parent',
        });
      }
      return this.iframeHost;
    }

    if (!this.offscreenHost) {
      this.offscreenHost = new OffscreenRenderHost(this.messageService, 'chrome-renderer');
    }
    return this.offscreenHost;
  }

  private async applyThemeIfNeeded(host: RenderHost): Promise<void> {
    if (!this.themeConfig) {
      return;
    }
    if (!this.themeDirty) {
      return;
    }
    await host.send('SET_THEME_CONFIG', { config: this.themeConfig }, 300000);
    this.themeDirty = false;
  }

  async setThemeConfig(config: RendererThemeConfig): Promise<void> {
    this.themeConfig = config;
    this.themeDirty = true;
    const host = await this.getHost();
    await this.applyThemeIfNeeded(host);
  }

  async render(type: string, content: string | object, options: RenderOptions = {}): Promise<RenderResult> {
    // Generate cache key
    const inputString = typeof content === 'string' ? content : JSON.stringify(content);
    const contentKey = inputString + JSON.stringify(options);
    const cacheType = `${type.toUpperCase()}_PNG`;
    const cacheKey = await this.cache.generateKey(contentKey, cacheType, this.themeConfig);

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached as RenderResult;
    }

    const host = await this.getHost();
    await this.applyThemeIfNeeded(host);

    const result = await host.send<RenderResult>(
      'RENDER_DIAGRAM',
      {
        renderType: type,
        input: content,
        themeConfig: this.themeConfig,
        extraParams: options,
      },
      300000
    );

    // Cache the result asynchronously (don't wait)
    this.cache.set(cacheKey, result, cacheType).catch(() => {});

    return result;
  }
}

// ============================================================================
// Chrome I18n Service
// Extends BaseI18nService for common message lookup logic
// ============================================================================

export class ChromeI18nService extends BaseI18nService {
  private storageService: ChromeStorageService;
  private resourceService: ChromeResourceService;

  constructor(storageService: ChromeStorageService, resourceService: ChromeResourceService) {
    super();
    this.storageService = storageService;
    this.resourceService = resourceService;
  }

  async init(): Promise<void> {
    try {
      await this.ensureFallbackMessages();
      const result = await this.storageService.get(['markdownViewerSettings']);
      const settings = (result.markdownViewerSettings || {}) as Record<string, unknown>;
      const preferredLocale = (settings.preferredLocale as string) || DEFAULT_SETTING_LOCALE;
      
      if (preferredLocale !== DEFAULT_SETTING_LOCALE) {
        await this.loadLocale(preferredLocale);
      }
      this.locale = preferredLocale;
    } catch (error) {
      console.warn('[I18n] init failed:', error);
    } finally {
      this.ready = Boolean(this.messages || this.fallbackMessages);
    }
  }

  async loadLocale(locale: string): Promise<void> {
    try {
      this.messages = await this.fetchLocaleData(locale);
      this.ready = Boolean(this.messages || this.fallbackMessages);
    } catch (error) {
      console.warn('[I18n] Failed to load locale', locale, error);
      this.messages = null;
      this.ready = Boolean(this.fallbackMessages);
    }
  }

  async fetchLocaleData(locale: string): Promise<LocaleMessages | null> {
    try {
      const url = this.resourceService.getURL(`_locales/${locale}/messages.json`);
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('[I18n] fetchLocaleData failed for', locale, error);
      return null;
    }
  }

  translate(key: string, substitutions?: string | string[]): string {
    if (!key) return '';

    // Try user-selected messages first (using base class logic)
    const value = this.lookupMessage(this.messages, key, substitutions);
    if (value !== null) return value;

    // Try fallback messages
    const fallbackValue = this.lookupMessage(this.fallbackMessages, key, substitutions);
    if (fallbackValue !== null) return fallbackValue;

    // Use Chrome's built-in i18n as last resort
    if (chrome?.i18n?.getMessage) {
      return chrome.i18n.getMessage(key, substitutions) || '';
    }

    return '';
  }

  getUILanguage(): string {
    if (chrome?.i18n?.getUILanguage) {
      return chrome.i18n.getUILanguage();
    }
    return navigator.language || 'en';
  }
}

// ============================================================================
// Chrome Platform API
// ============================================================================

export class ChromePlatformAPI {
  public readonly platform = 'chrome' as const;
  
  // Services
  public readonly storage: ChromeStorageService;
  public readonly file: ChromeFileService;
  public readonly resource: ChromeResourceService;
  public readonly message: ChromeMessageService;
  public readonly cache: ChromeCacheService;
  public readonly renderer: ChromeRendererService;
  public readonly i18n: ChromeI18nService;

  constructor() {
    // Initialize services
    this.storage = new ChromeStorageService();
    this.file = new ChromeFileService();
    this.resource = new ChromeResourceService();
    this.message = new ChromeMessageService();
    this.cache = new ChromeCacheService(this.message);
    this.renderer = new ChromeRendererService(this.message, this.cache);
    this.i18n = new ChromeI18nService(this.storage, this.resource);
  }

  async init(): Promise<void> {
    await this.cache.init();
    await this.i18n.init();
  }
}

// ============================================================================
// Export
// ============================================================================

export const chromePlatform = new ChromePlatformAPI();

export { DEFAULT_SETTING_LOCALE };
