/**
 * Shared Render Worker Core
 * 
 * Platform-agnostic rendering logic shared between:
 * - Chrome extension's offscreen document (render-worker-chrome.js)
 * - Mobile WebView's render iframe (render-worker-mobile.js)
 * 
 * Each platform provides its own message adapter that calls these functions.
 */

import type { BaseRenderer } from './base-renderer';
import { getRegisteredRendererTypes, getRenderer, hasRenderer as hasRegisteredRenderer } from './renderer-registry';
import type { DomMountResult, RendererThemeConfig, RenderResult } from '../types/index';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Render request options
 */
export interface RenderRequest {
  renderType: string;
  input: string | object;
  themeConfig?: RendererThemeConfig | null;
}

/**
 * DOM mount request options (live mode)
 */
export interface MountRequest extends RenderRequest {
  host: HTMLElement;
}

/**
 * Init options
 */
interface InitOptions {
  canvas?: HTMLCanvasElement;
}

// ============================================================================
// State and Maps
// ============================================================================

function getRendererOrThrow(renderType: string): BaseRenderer {
  const renderer = getRenderer(renderType);
  if (!renderer) {
    throw new Error(`No renderer found for type: ${renderType}`);
  }
  return renderer;
}

// Store current theme configuration
let currentThemeConfig: RendererThemeConfig | null = null;

// ============================================================================
// Functions
// ============================================================================

/**
 * Set theme configuration
 * @param config - Theme configuration
 */
export function setThemeConfig(config: RendererThemeConfig): void {
  currentThemeConfig = config;
}

/**
 * Get current theme configuration
 * @returns Current theme config
 */
export function getThemeConfig(): RendererThemeConfig | null {
  return currentThemeConfig;
}

/**
 * Handle render request
 * @param options - Render options
 * @returns Render result with base64, width, height
 */
export async function handleRender({ renderType, input, themeConfig }: RenderRequest): Promise<RenderResult> {
  // Update theme config if provided
  if (themeConfig) {
    currentThemeConfig = themeConfig;
  }

  const renderer = getRendererOrThrow(renderType);

  // Perform render with current theme config
  const result = await renderer.render(input, currentThemeConfig);
  if (!result) {
    throw new Error('Renderer returned empty result');
  }
  return result;
}

/**
 * Handle a DOM mount request (live mode).
 *
 * Default behavior is renderer-specific; for renderers that don't override `mountToDom`,
 * BaseRenderer falls back to rendering a PNG and inserting an <img>.
 */
export async function handleMountToDom({ renderType, input, themeConfig, host }: MountRequest): Promise<DomMountResult> {
  if (themeConfig) {
    currentThemeConfig = themeConfig;
  }

  const renderer = getRendererOrThrow(renderType);

  return await renderer.mountToDom(input, currentThemeConfig, host);
}

/**
 * Get list of available renderer types
 * @returns Array of renderer type names
 */
export function getAvailableRenderers(): string[] {
  return getRegisteredRendererTypes();
}

/**
 * Check if a renderer type is available
 * @param type - Renderer type
 * @returns True if renderer exists
 */
export function hasRenderer(type: string): boolean {
  return hasRegisteredRenderer(type);
}

/**
 * Initialize render environment
 * Call this on DOM ready to optimize canvas performance
 * @param options - Initialization options
 */
export function initRenderEnvironment({ canvas }: InitOptions = {}): void {
  // Pre-initialize canvas context for better performance
  if (canvas) {
    canvas.getContext('2d', { willReadFrequently: true });
  }

  // Initialize Mermaid if available
  if (typeof window !== 'undefined') {
    const win = window as unknown as { mermaid?: { initialize: (config: object) => void } };
    if (win.mermaid && typeof win.mermaid.initialize === 'function') {
      win.mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      });
    }
  }
}

// Message type constants for consistency
export const MessageTypes = {
  // Requests
  RENDER_DIAGRAM: 'RENDER_DIAGRAM',
  SET_THEME_CONFIG: 'SET_THEME_CONFIG',
  PING: 'PING',
  
  // Responses
  RESPONSE: 'RESPONSE',
  
  // Lifecycle
  READY: 'READY',
  READY_ACK: 'READY_ACK',
  ERROR: 'ERROR'
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
