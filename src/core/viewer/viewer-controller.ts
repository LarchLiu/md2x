// ViewerController
// Shared, platform-agnostic markdown rendering orchestration.

import {
  AsyncTaskManager,
  extractHeadings,
  extractTitle,
  processMarkdownToHtml,
  renderHtmlIncrementally,
  type HeadingInfo,
} from '../markdown-processor';

import type { PluginRenderer, TranslateFunction } from '../../types/index';

export type ViewerRenderResult = {
  title: string | null;
  headings: HeadingInfo[];
  taskManager: AsyncTaskManager;
};

export type RenderMarkdownOptions = {
  markdown: string;
  container: HTMLElement;
  renderer: PluginRenderer;
  translate: TranslateFunction;

  /**
   * Optional external task manager, useful for cancellation.
   * If not provided, a new AsyncTaskManager will be created.
   */
  taskManager?: AsyncTaskManager;

  /**
   * When true, container.innerHTML will be cleared before rendering.
   * Keep false if the caller wants to clear before applying theme to avoid flicker.
   */
  clearContainer?: boolean;

  /**
   * Whether to process async tasks immediately.
   * If false, caller can run taskManager.processAll() later.
   */
  processTasks?: boolean;

  /**
   * Incremental DOM render options.
   */
  batchSize?: number;
  yieldDelay?: number;

  onHeadings?: (headings: HeadingInfo[]) => void;
  onProgress?: (completed: number, total: number) => void;
  onBeforeTasks?: () => void;
  onAfterTasks?: () => void;
  postProcess?: (container: Element) => Promise<void> | void;
};

export async function renderMarkdownDocument(options: RenderMarkdownOptions): Promise<ViewerRenderResult> {
  const {
    markdown,
    container,
    renderer,
    translate,
    taskManager: providedTaskManager,
    clearContainer = true,
    processTasks = true,
    batchSize = 200,
    yieldDelay = 0,
    onHeadings,
    onProgress,
    onBeforeTasks,
    onAfterTasks,
    postProcess,
  } = options;

  const taskManager = providedTaskManager ?? new AsyncTaskManager(translate);

  const html = await processMarkdownToHtml(markdown, {
    renderer,
    taskManager,
    translate,
  });

  if (taskManager.isAborted()) {
    return {
      title: extractTitle(markdown),
      headings: [],
      taskManager,
    };
  }

  if (clearContainer) {
    container.innerHTML = '';
  }

  await renderHtmlIncrementally(container, html, { batchSize, yieldDelay });

  if (taskManager.isAborted()) {
    return {
      title: extractTitle(markdown),
      headings: [],
      taskManager,
    };
  }

  const headings = extractHeadings(container);
  onHeadings?.(headings);

  if (processTasks) {
    onBeforeTasks?.();
    await taskManager.processAll((completed, total) => {
      onProgress?.(completed, total);
    });
    onAfterTasks?.();

    if (taskManager.isAborted()) {
      return {
        title: extractTitle(markdown),
        headings,
        taskManager,
      };
    }

    await postProcess?.(container);
  }

  return {
    title: extractTitle(markdown),
    headings,
    taskManager,
  };
}
