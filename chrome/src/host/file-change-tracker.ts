/**
 * File Change Tracker
 *
 * Monitors local file:// URLs for changes and notifies tabs when content changes.
 * Uses chrome.alarms API for persistent polling that survives service worker termination.
 * State is persisted to chrome.storage.local.
 */

import { hashCode } from '../../../src/utils/hash';

/**
 * Tracked file metadata
 */
interface TrackedFile {
  url: string;
  lastHash: string;
  tabId: number;
}

/**
 * Persisted tracker state
 */
interface TrackerState {
  trackedFiles: Array<{ url: string; lastHash: string; tabId: number }>;
}

/**
 * Auto refresh settings
 */
export interface AutoRefreshSettings {
  enabled: boolean;
  intervalMs: number;
}

/**
 * Default auto refresh settings
 */
export const DEFAULT_AUTO_REFRESH_SETTINGS: AutoRefreshSettings = {
  enabled: true,
  intervalMs: 1000,
};

// Storage key for persisted tracker state
const TRACKER_STATE_KEY = 'fileChangeTrackerState';

// Alarm name for file change checking
const FILE_CHECK_ALARM_NAME = 'fileChangeCheck';

// Minimum alarm interval (Chrome requires at least 1 minute for alarms in production,
// but allows smaller values in development)
const MIN_ALARM_PERIOD_MINUTES = 0.1; // 6 seconds, works in dev mode

/**
 * File Change Tracker class
 *
 * Manages polling of local files using chrome.alarms and notifies associated tabs when content changes.
 * State is persisted to survive service worker termination.
 */
export class FileChangeTracker {
  private trackedFiles: Map<string, TrackedFile> = new Map();
  private settings: AutoRefreshSettings = DEFAULT_AUTO_REFRESH_SETTINGS;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize tracker by loading persisted state
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadState();
    await this.initPromise;
    this.initialized = true;
  }

  /**
   * Load persisted state from storage
   */
  private async loadState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([TRACKER_STATE_KEY, 'autoRefreshSettings']);
      
      // Restore settings
      if (result.autoRefreshSettings) {
        this.settings = result.autoRefreshSettings as AutoRefreshSettings;
      }

      // Restore tracked files
      if (result[TRACKER_STATE_KEY]) {
        const state = result[TRACKER_STATE_KEY] as TrackerState;
        for (const file of state.trackedFiles) {
          // Verify tab still exists before restoring
          try {
            await chrome.tabs.get(file.tabId);
            this.trackedFiles.set(file.url, file);
          } catch {
            // Tab no longer exists, skip this file
          }
        }
      }

      // Start alarm if we have files to track
      if (this.settings.enabled && this.trackedFiles.size > 0) {
        await this.startAlarm();
      }
    } catch (error) {
      console.warn('[FileChangeTracker] Failed to load state:', error);
    }
  }

  /**
   * Persist current state to storage
   */
  private async saveState(): Promise<void> {
    try {
      const state: TrackerState = {
        trackedFiles: Array.from(this.trackedFiles.values()),
      };
      await chrome.storage.local.set({ [TRACKER_STATE_KEY]: state });
    } catch (error) {
      console.warn('[FileChangeTracker] Failed to save state:', error);
    }
  }

  /**
   * Update tracker settings
   */
  async updateSettings(settings: AutoRefreshSettings): Promise<void> {
    this.settings = settings;

    // Persist settings
    await chrome.storage.local.set({ autoRefreshSettings: settings });

    // Restart alarm with new settings if we have tracked files
    if (this.trackedFiles.size > 0) {
      await this.stopAlarm();
      if (this.settings.enabled) {
        await this.startAlarm();
      }
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AutoRefreshSettings {
    return this.settings;
  }

  /**
   * Start tracking a file
   */
  async startTracking(
    fileUrl: string,
    tabId: number,
    readFileFn: (url: string) => Promise<string>
  ): Promise<void> {
    // Ensure initialized
    await this.initialize();

    // Only track file:// URLs
    if (!fileUrl.startsWith('file://')) {
      return;
    }

    try {
      // Read initial content and compute hash
      const content = await readFileFn(fileUrl);
      const hash = hashCode(content);

      this.trackedFiles.set(fileUrl, {
        url: fileUrl,
        lastHash: hash,
        tabId,
      });

      // Persist state
      await this.saveState();

      // Start alarm if not already running and enabled
      if (this.settings.enabled) {
        await this.startAlarm();
      }
    } catch (error) {
      console.warn(`[FileChangeTracker] Failed to start tracking ${fileUrl}:`, error);
    }
  }

  /**
   * Stop tracking a specific file
   */
  async stopTracking(fileUrl: string): Promise<void> {
    this.trackedFiles.delete(fileUrl);

    // Persist state
    await this.saveState();

    // Stop alarm if no files are tracked
    if (this.trackedFiles.size === 0) {
      await this.stopAlarm();
    }
  }

  /**
   * Stop tracking all files for a specific tab
   */
  async stopTrackingByTab(tabId: number): Promise<void> {
    for (const [url, tracked] of this.trackedFiles) {
      if (tracked.tabId === tabId) {
        this.trackedFiles.delete(url);
      }
    }

    // Persist state
    await this.saveState();

    // Stop alarm if no files are tracked
    if (this.trackedFiles.size === 0) {
      await this.stopAlarm();
    }
  }

  /**
   * Start the alarm for periodic checking
   */
  private async startAlarm(): Promise<void> {
    // Check if alarm already exists
    const existingAlarm = await chrome.alarms.get(FILE_CHECK_ALARM_NAME);
    if (existingAlarm) {
      return;
    }

    // Use the configured interval, but respect Chrome's minimum
    // For sub-minute intervals, we'll use delayInMinutes to trigger more frequently
    const periodMinutes = Math.max(
      this.settings.intervalMs / 60000,
      MIN_ALARM_PERIOD_MINUTES
    );

    await chrome.alarms.create(FILE_CHECK_ALARM_NAME, {
      delayInMinutes: MIN_ALARM_PERIOD_MINUTES,
      periodInMinutes: periodMinutes,
    });
  }

  /**
   * Stop the alarm
   */
  private async stopAlarm(): Promise<void> {
    await chrome.alarms.clear(FILE_CHECK_ALARM_NAME);
  }

  /**
   * Handle alarm event - check all tracked files for changes
   * This method should be called from chrome.alarms.onAlarm listener
   */
  async handleAlarm(): Promise<void> {
    // Skip if disabled
    if (!this.settings.enabled) {
      return;
    }

    // Ensure initialized
    await this.initialize();

    if (this.trackedFiles.size === 0) {
      await this.stopAlarm();
      return;
    }

    const filesToRemove: string[] = [];

    for (const [url, tracked] of this.trackedFiles) {
      try {
        await this.checkFileChange(tracked);
      } catch (error) {
        // File might be deleted or inaccessible, mark for removal
        console.warn(`[FileChangeTracker] Error checking ${url}, removing from tracking:`, error);
        filesToRemove.push(url);
      }
    }

    // Remove failed files
    for (const url of filesToRemove) {
      this.trackedFiles.delete(url);
    }

    // Persist state if files were removed
    if (filesToRemove.length > 0) {
      await this.saveState();
    }

    // Stop alarm if all files were removed due to errors
    if (this.trackedFiles.size === 0) {
      await this.stopAlarm();
    }
  }

  /**
   * Check a single file for changes
   */
  private async checkFileChange(tracked: TrackedFile): Promise<void> {
    // First verify tab still exists
    try {
      await chrome.tabs.get(tracked.tabId);
    } catch {
      throw new Error('Tab no longer exists');
    }

    // Use fetch to read file (background script has file:// permission)
    const response = await fetch(tracked.url);
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.status}`);
    }

    const content = await response.text();
    const newHash = hashCode(content);

    if (newHash !== tracked.lastHash) {
      tracked.lastHash = newHash;
      await this.saveState();
      await this.notifyChange(tracked.tabId, tracked.url, content);
    }
  }

  /**
   * Notify a tab that its file has changed
   */
  private async notifyChange(tabId: number, url: string, content: string): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, {
        id: `file-change-${Date.now()}`,
        type: 'FILE_CHANGED',
        payload: {
          url,
          content,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      // Tab might be closed or not ready, stop tracking it
      console.warn(`[FileChangeTracker] Failed to notify tab ${tabId}:`, error);
      await this.stopTrackingByTab(tabId);
    }
  }

  /**
   * Get tracking status for debugging
   */
  getStatus(): { trackedCount: number; isPolling: boolean; settings: AutoRefreshSettings } {
    return {
      trackedCount: this.trackedFiles.size,
      isPolling: this.trackedFiles.size > 0 && this.settings.enabled,
      settings: this.settings,
    };
  }
}

// Singleton instance
let fileChangeTrackerInstance: FileChangeTracker | null = null;

/**
 * Get the singleton FileChangeTracker instance
 */
export function getFileChangeTracker(): FileChangeTracker {
  if (!fileChangeTrackerInstance) {
    fileChangeTrackerInstance = new FileChangeTracker();
  }
  return fileChangeTrackerInstance;
}

/**
 * Get the alarm name used by the tracker
 */
export function getFileCheckAlarmName(): string {
  return FILE_CHECK_ALARM_NAME;
}
