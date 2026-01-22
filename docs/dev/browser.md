# Browser SDK 实现方案

> 基于现有架构，在浏览器端不通过插件直接使用完整功能

---

## 架构概览

```
┌─────────────────────────────────────────────────────┐
│  Web 应用入口 (index.html + main.ts)                │
├─────────────────────────────────────────────────────┤
│  Web PlatformAPI 实现                               │
│  ├── WebCacheService (IndexedDB)                    │
│  ├── WebStorageService (localStorage)               │
│  ├── WebRendererService (iframe 隔离渲染)           │
│  ├── WebFileService (File API / Blob download)      │
│  ├── WebI18nService (JSON 语言包)                   │
│  └── WebResourceService (相对路径)                  │
├─────────────────────────────────────────────────────┤
│  共享核心层 (src/) - 直接复用                        │
│  ├── core/ (MarkdownDocument, 块级处理)             │
│  ├── plugins/ (Mermaid, Vega, Graphviz...)          │
│  ├── renderers/ (图表渲染器)                        │
│  ├── exporters/ (DOCX 导出)                         │
│  └── themes/ (主题系统)                             │
└─────────────────────────────────────────────────────┘
```

---

## 阶段一：SDK 核心模块

### 1.1 目录结构

```
sdk/
├── index.ts           # 统一入口
├── core.ts            # 核心处理 API
├── document.ts        # 块级文档模型
├── plugins.ts         # 插件 API
├── renderers.ts       # 渲染器 API
├── exporters.ts       # 导出 API
└── types.ts           # 类型导出
```

### 1.2 核心导出

```typescript
// sdk/index.ts
export * from './core';
export * from './document';
export * from './plugins';
export * from './renderers';
export * from './exporters';
export * from './types';
```

### 1.3 各模块导出清单

| 模块 | 导出内容 |
|-----|---------|
| **core** | `processMarkdownToHtml`, `createMarkdownProcessor`, `AsyncTaskManager` |
| **document** | `MarkdownDocument`, `executeDOMCommands`, `splitMarkdownIntoBlocks` |
| **plugins** | `plugins`, `registerRemarkPlugins`, `getPluginByType`, `BasePlugin` |
| **renderers** | `renderers`, `registerAllRenderers`, `IframeRenderHost`, `BaseRenderer` |
| **exporters** | `DocxExporter`, `downloadDocx` |
| **types** | `BlockMeta`, `DOMCommand`, `RenderResult`, `DOCXExportResult` 等 |

---

## 阶段二：平台适配层

### 2.1 PlatformAPI 接口

需要实现 7 个服务接口：

| 服务 | 职责 | Web 实现方案 |
|-----|------|-------------|
| **CacheService** | 渲染结果缓存 | IndexedDB |
| **StorageService** | 用户设置存储 | localStorage |
| **RendererService** | 图表渲染代理 | 隐藏 iframe + postMessage |
| **FileService** | 文件读取/下载 | `<input type="file">` + Blob |
| **ResourceService** | 静态资源加载 | 相对路径 / CDN |
| **I18nService** | 国际化文本 | fetch 加载 JSON 语言包 |
| **DocumentService** | 文档操作 | 直接 DOM 操作 |

### 2.2 Web 平台实现

```typescript
// web/src/platform/web-platform.ts
import type { PlatformAPI } from '@anthropic/markdown-sdk';

export function createWebPlatform(): PlatformAPI {
  return {
    cache: new WebCacheService(),
    storage: new WebStorageService(),
    renderer: new WebRendererService(),
    file: new WebFileService(),
    resource: new WebResourceService(),
    i18n: new WebI18nService(),
    document: new WebDocumentService(),
  };
}
```

### 2.3 关键服务实现

#### 渲染服务 (iframe 隔离)

```typescript
class WebRendererService {
  private iframe: HTMLIFrameElement;
  private pending = new Map<string, { resolve, reject }>();

  constructor() {
    this.iframe = document.createElement('iframe');
    this.iframe.style.display = 'none';
    this.iframe.src = '/renderer.html';
    document.body.appendChild(this.iframe);

    window.addEventListener('message', (e) => {
      const { id, result, error } = e.data;
      const handler = this.pending.get(id);
      if (handler) {
        error ? handler.reject(error) : handler.resolve(result);
        this.pending.delete(id);
      }
    });
  }

  render(type: string, content: string): Promise<string> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.iframe.contentWindow?.postMessage({ id, type, content }, '*');
    });
  }
}
```

#### 文件服务

```typescript
class WebFileService {
  async readFile(): Promise<{ name: string; content: string }> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (file) {
          resolve({ name: file.name, content: await file.text() });
        }
      };
      input.click();
    });
  }

  download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

---

## 阶段三：块级处理系统

### 3.1 核心类 MarkdownDocument

文档模型，支持增量更新和滚动同步。

#### 主要 API

| 方法 | 说明 |
|-----|------|
| `update(markdown)` | 更新内容，返回 DOM 命令和统计 |
| `getBlocks()` | 获取所有块元数据 |
| `getBlockById(id)` | O(1) 按 ID 查找块 |
| `findBlockByLine(line)` | 按行号查找块 |
| `setBlockHtml(index, html)` | 设置块的渲染结果 |
| `getBlocksNeedingRender()` | 获取需要渲染的块 |
| `getFullHtml()` | 获取完整 HTML |
| `getLinePosition(line)` | 滚动同步：行号 → 块位置 |
| `getLineFromBlockId(id, progress)` | 滚动同步：块位置 → 行号 |

#### BlockMeta 数据结构

```typescript
interface BlockMeta {
  id: string;        // 稳定唯一标识
  hash: string;      // 内容哈希
  startLine: number; // 源码起始行号
  lineCount: number; // 行数
  content: string;   // 原始内容
  html?: string;     // 渲染结果
}
```

### 3.2 DOM 命令系统

平台无关的 DOM 更新指令：

```typescript
type DOMCommand =
  | { type: 'clear' }
  | { type: 'append'; blockId; html; attrs }
  | { type: 'insertBefore'; blockId; html; refId; attrs }
  | { type: 'remove'; blockId }
  | { type: 'replace'; blockId; html; attrs }
  | { type: 'updateAttrs'; blockId; attrs };
```

### 3.3 Diff 算法流程

```
输入: 新 Markdown
    ↓
splitMarkdownIntoBlocksWithLines()  → 分割为语义块
    ↓
hashCode(block.content)             → 计算每块哈希
    ↓
computeDiff(oldBlocks, newBlocks)   → LCS 算法比较
    ↓
generateDOMCommands()               → 生成最小 DOM 操作
    ↓
输出: DOMCommand[]
```

### 3.4 块类型检测优先级

| 优先级 | 类型 | 起始标识 |
|-------|------|---------|
| 1 | frontMatter | 文件首行 `---` |
| 2 | fencedCode | ` ``` ` 或 `~~~` |
| 3 | mathBlock | `$$` |
| 4 | htmlBlock | `<div>` 等块级标签 |
| 5 | table | `\|` |
| 6 | blockquote | `>` |
| 7 | list | `-`, `*`, `1.`, `•` 等 |
| 8 | indentedCode | 4空格/Tab |
| 9 | heading | `#` |
| 10 | paragraph | 默认 |

### 3.5 增量更新使用示例

```typescript
import {
  MarkdownDocument,
  executeDOMCommands,
  processMarkdownToHtml,
} from '@anthropic/markdown-sdk';

const doc = new MarkdownDocument();

async function updateDocument(markdown: string, container: HTMLElement) {
  // 1. 计算 diff
  const { commands, stats } = doc.update(markdown);
  console.log(`kept: ${stats.kept}, inserted: ${stats.inserted}, removed: ${stats.removed}`);

  // 2. 渲染需要更新的块
  const blocksToRender = doc.getBlocksNeedingRender();
  await Promise.all(
    blocksToRender.map(async ({ block, index }) => {
      const html = await processMarkdownToHtml(block.content, options);
      doc.setBlockHtml(index, html);
    })
  );

  // 3. 补充 HTML 到命令
  const finalCommands = commands.map(cmd => {
    if ('blockId' in cmd && cmd.type !== 'remove' && cmd.type !== 'updateAttrs') {
      const block = doc.getBlockById(cmd.blockId);
      return { ...cmd, html: block?.html || '' };
    }
    return cmd;
  });

  // 4. 执行 DOM 更新
  executeDOMCommands(container, finalCommands, document);
}
```

### 3.6 滚动同步

```typescript
// 编辑器行号 → 预览位置
function scrollPreviewToLine(line: number, container: HTMLElement) {
  const pos = doc.getBlockPositionFromLine(line);
  if (!pos) return;

  const el = container.querySelector(`[data-block-id="${pos.blockId}"]`);
  if (el) {
    const targetY = el.offsetTop + el.offsetHeight * pos.progress;
    container.scrollTo({ top: targetY, behavior: 'smooth' });
  }
}

// 预览位置 → 编辑器行号
function getLineFromScroll(container: HTMLElement): number {
  const scrollTop = container.scrollTop;

  for (const block of doc.getBlocks()) {
    const el = container.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
    if (!el) continue;

    if (scrollTop >= el.offsetTop && scrollTop < el.offsetTop + el.offsetHeight) {
      const progress = (scrollTop - el.offsetTop) / el.offsetHeight;
      return doc.getLineFromBlockId(block.id, progress) ?? 0;
    }
  }
  return 0;
}
```

---

## 阶段四：完整功能集成

### 4.1 Web 应用入口

```typescript
// web/src/main.ts
import {
  processMarkdownToHtml,
  AsyncTaskManager,
  MarkdownDocument,
  executeDOMCommands,
  IframeRenderHost,
  DocxExporter,
} from '@anthropic/markdown-sdk';
import { createWebPlatform } from './platform/web-platform';

const platform = createWebPlatform();
const renderHost = new IframeRenderHost();
const doc = new MarkdownDocument();
const translate = (key: string) => key;

// 初始化
await renderHost.initialize();

// 渲染 Markdown
async function render(markdown: string) {
  const taskManager = new AsyncTaskManager(translate);

  const { commands } = doc.update(markdown);

  for (const { block, index } of doc.getBlocksNeedingRender()) {
    const html = await processMarkdownToHtml(block.content, {
      renderer: renderHost,
      taskManager,
      translate,
    });
    doc.setBlockHtml(index, html);
  }

  // 处理异步任务 (图表渲染)
  await taskManager.processAll();

  executeDOMCommands(
    document.getElementById('preview')!,
    commands.map(cmd => {
      if ('blockId' in cmd && cmd.type !== 'remove') {
        return { ...cmd, html: doc.getBlockById(cmd.blockId)?.html || '' };
      }
      return cmd;
    }),
    document
  );
}

// 导出 DOCX
async function exportDocx(markdown: string) {
  const exporter = new DocxExporter(renderHost);
  const { buffer, filename } = await exporter.exportToDocx(markdown, {
    theme: 'default',
    title: 'Document',
  });

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  platform.file.download(blob, filename);
}
```

### 4.2 依赖清单

```json
{
  "dependencies": {
    "unified": "^11.x",
    "remark-parse": "^11.x",
    "remark-gfm": "^4.x",
    "remark-math": "^6.x",
    "remark-rehype": "^11.x",
    "rehype-highlight": "^7.x",
    "rehype-katex": "^7.x",
    "rehype-stringify": "^10.x",
    "mermaid": "^11.x",
    "@viz-js/viz": "^3.x",
    "vega": "^5.x",
    "vega-lite": "^5.x",
    "vega-embed": "^6.x",
    "@antv/infographic": "^0.2.x",
    "katex": "^0.16.x",
    "mathjax-full": "^3.2.x",
    "docx": "^9.x"
  }
}
```

### 4.3 构建配置

```typescript
// build-sdk.ts
import * as esbuild from 'esbuild';

// ESM 版本
await esbuild.build({
  entryPoints: ['sdk/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/markdown-sdk.esm.js',
  external: ['mermaid', 'vega', 'vega-lite', 'katex', 'mathjax-full', 'docx'],
  platform: 'browser',
  target: 'es2020',
});

// UMD 版本
await esbuild.build({
  entryPoints: ['sdk/index.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'MarkdownSDK',
  outfile: 'dist/markdown-sdk.umd.js',
  platform: 'browser',
});
```

### 4.4 产出物

```
dist/
├── markdown-sdk.esm.js      # ES Module
├── markdown-sdk.umd.js      # UMD (浏览器全局变量)
├── markdown-sdk.d.ts        # TypeScript 类型声明
└── markdown-sdk.css         # 样式 (KaTeX, 代码高亮)
```

---

## 功能对照表

| 功能 | 浏览器扩展 | Web SDK |
|-----|-----------|---------|
| Markdown 渲染 | ✅ | ✅ |
| 图表 (Mermaid/Vega/Graphviz) | ✅ | ✅ |
| 数学公式 (KaTeX) | ✅ | ✅ |
| 代码高亮 | ✅ | ✅ |
| 主题系统 | ✅ | ✅ |
| DOCX 导出 | ✅ | ✅ |
| 增量渲染 | ✅ | ✅ |
| 滚动同步 | ✅ | ✅ |
| 本地文件访问 | chrome.fileSystem | File API |
| 设置同步 | chrome.storage.sync | localStorage |
| 渲染隔离 | Offscreen Document | iframe |

---

## 实现路线图

1. **阶段一** - SDK 核心模块导出，类型定义
2. **阶段二** - Web PlatformAPI 实现
3. **阶段三** - 块级处理、增量更新、滚动同步
4. **阶段四** - 完整功能集成、构建打包、示例应用
