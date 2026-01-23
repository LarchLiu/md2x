/**
 * MCP Server for Markdown Conversion
 * Exposes markdown conversion tools via Model Context Protocol
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import packageJson from '../../package.json' with { type: 'json' };
import { convert, formatToExtension, isImageFormat } from './index.js';
import type { OutputFormat, DiagramMode } from './types.js';
import { registry } from './themes-data.js';

// ============================================================================
// Schema Definitions
// ============================================================================

const ConvertMarkdownSchema = z.object({
  markdownFilePath: z.string().describe('Path to markdown file to convert'),
  // markdown: z.string().optional().describe('Markdown content to convert'),
  format: z.enum(['pdf', 'docx', 'html', 'png', 'jpg', 'jpeg', 'webp']).default('pdf').describe('Output format'),
  theme: z.string().default('default').describe('Theme name to apply'),
  diagramMode: z.enum(['img', 'live', 'none']).optional().describe('Diagram rendering mode (default: img for DOCX, live for others)'),
  hrAsPageBreak: z.boolean().optional().describe('Convert horizontal rules to page breaks (default: true for PDF/DOCX, false for HTML/Image)'),
  title: z.string().optional().describe('Document title'),
  basePath: z.string().optional().describe('Base path for resolving relative paths'),
  templatesDir: z.array(z.string()).optional().describe('Extra directories to search for md2x templates referenced by ```md2x blocks'),
  liveRuntime: z.enum(['inline', 'cdn']).optional().describe('HTML live runtime injection strategy (for HTML format with live diagrams)'),
  liveRuntimeBaseUrl: z.string().optional().describe('Custom runtime base URL when liveRuntime is cdn'),
  outputPath: z.string().optional().describe('Output file path (optional, defaults to temp directory with generated filename)'),
});

const ListThemesSchema = z.object({});

// ============================================================================
// Template Loading Helpers
// ============================================================================

function loadTemplatesFromDir(dir: string, basePath: string): Record<string, string> {
  const out: Record<string, string> = {};

  const resolveDir = (d: string): string => {
    const raw = String(d || '').trim();
    if (!raw) return '';
    try {
      if (raw.toLowerCase().startsWith('file://')) return fileURLToPath(raw);
    } catch {}
    return path.isAbsolute(raw) ? raw : path.join(basePath, raw);
  };

  const root = resolveDir(dir);
  if (!root) return out;
  if (!fs.existsSync(root)) return out;

  const walk = (p: string) => {
    let st: fs.Stats;
    try {
      st = fs.statSync(p);
    } catch {
      return;
    }

    if (st.isDirectory()) {
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(p);
      } catch {
        return;
      }
      for (const name of entries) {
        walk(path.join(p, name));
      }
      return;
    }

    if (!st.isFile()) return;

    let content = '';
    try {
      content = fs.readFileSync(p, 'utf-8');
    } catch {
      return;
    }

    const rel = path.relative(root, p);
    const relPosix = rel.split(path.sep).join('/');
    const baseName = path.basename(p);

    // Primary key: `vue/foo.vue`, `svelte/foo.svelte`, ...
    out[relPosix] = content;
    // Convenience keys for blocks that only specify the filename.
    out[baseName] = content;
    // Also expose `./...` to match blocks like `template: './vue/foo.vue'`.
    out[`./${relPosix}`] = content;
    // And file:// keys for callers that use absolute URLs.
    try {
      out[pathToFileURL(p).href] = content;
    } catch {
      // ignore
    }
  };

  walk(root);
  return out;
}

function loadTemplatesFromDirs(dirs: string[], basePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of dirs) {
    Object.assign(out, loadTemplatesFromDir(d, basePath));
  }
  return out;
}

// ============================================================================
// MCP Server Implementation
// ============================================================================

export class MarkdownMcpServer {
  private mcpServer: McpServer;

  constructor() {
    this.mcpServer = new McpServer(
      {
        name: 'md2x-mcp-server',
        version: packageJson.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.mcpServer.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'convert_markdown',
          description: 'Convert markdown content to PDF, DOCX, HTML, or Image formats. Supports themes, diagrams (Mermaid, Graphviz, Vega), math equations, code highlighting, and more.',
          inputSchema: {
            type: 'object',
            properties: {
              markdownFilePath: {
                type: 'string',
                description: 'Path to markdown file to convert',
              },
              // markdown: {
              //   type: 'string',
              //   description: 'Markdown content to convert',
              // },
              format: {
                type: 'string',
                enum: ['pdf', 'docx', 'html', 'png', 'jpg', 'jpeg', 'webp'],
                default: 'pdf',
                description: 'Output format',
              },
              theme: {
                type: 'string',
                default: 'default',
                description: 'Theme name to apply',
              },
              diagramMode: {
                type: 'string',
                enum: ['img', 'live', 'none'],
                description: 'Diagram rendering mode (default: img for DOCX, live for others)',
              },
              hrAsPageBreak: {
                type: 'boolean',
                description: 'Convert horizontal rules to page breaks (default: true for PDF/DOCX, false for HTML/Image)',
              },
              title: {
                type: 'string',
                description: 'Document title',
              },
              basePath: {
                type: 'string',
                description: 'Base path for resolving relative paths',
              },
              templatesDir: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Extra directories to search for md2x templates referenced by ```md2x blocks',
              },
              liveRuntime: {
                type: 'string',
                enum: ['inline', 'cdn'],
                description: 'HTML live runtime injection strategy (for HTML format with live diagrams)',
              },
              liveRuntimeBaseUrl: {
                type: 'string',
                description: 'Custom runtime base URL when liveRuntime is cdn',
              },
              outputPath: {
                type: 'string',
                description: 'Output file path (optional, defaults to temp directory with generated filename)',
              },
            },
            required: ['markdownFilePath'],
          },
        },
        {
          name: 'list_themes',
          description: 'List all available themes for markdown conversion',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.mcpServer.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === 'convert_markdown') {
          return await this.handleConvertMarkdown(args);
        } else if (name === 'list_themes') {
          return await this.handleListThemes(args);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleConvertMarkdown(args: unknown) {
    const params = ConvertMarkdownSchema.parse(args);
    let markdown = ''

    if (params.markdownFilePath) {
      // Read markdown content from file
      const resolvedPath = path.resolve(params.markdownFilePath);
      markdown = fs.readFileSync(resolvedPath, 'utf-8');
    }

    if (!markdown) {
      return {
        content: [
          {
            type: 'text',
            text: "No markdown content provided for conversion.",
          },
        ],
      };
    }

    // Load templates from directories if specified
    const templates = params.templatesDir && params.templatesDir.length > 0
      ? loadTemplatesFromDirs(params.templatesDir, path.dirname(path.resolve(params.markdownFilePath)))
      : undefined;

    const result = await convert(markdown, {
      format: params.format as OutputFormat,
      theme: params.theme,
      diagramMode: params.diagramMode as DiagramMode | undefined,
      hrAsPageBreak: params.hrAsPageBreak,
      title: params.title,
      basePath: params.basePath,
      templates,
      liveRuntime: params.liveRuntime,
      liveRuntimeBaseUrl: params.liveRuntimeBaseUrl,
    });

    // Determine output path
    const outputExt = formatToExtension(result.format);
    let outputPath: string;

    if (params.outputPath) {
      outputPath = path.resolve(params.outputPath);
    } else {
      // Generate output filename in the same directory as the markdown file
      const markdownDir = path.dirname(path.resolve(params.markdownFilePath));
      const markdownBasename = path.basename(params.markdownFilePath, path.extname(params.markdownFilePath));
      const filename = `${markdownBasename}${outputExt}`;
      outputPath = path.join(markdownDir, filename);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const isImage = isImageFormat(result.format);

    // Handle multiple image parts (for split images)
    if (isImage && result.buffers && result.buffers.length > 1) {
      const buffers = result.buffers;
      const base = outputPath.endsWith(outputExt) ? outputPath.slice(0, -outputExt.length) : outputPath;
      const paths: string[] = [];

      for (let i = 0; i < buffers.length; i++) {
        const part = String(i + 1).padStart(3, '0');
        const p = `${base}.part-${part}${outputExt}`;
        fs.writeFileSync(p, buffers[i]);
        paths.push(p);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              format: result.format,
              outputPath: paths[0],
              outputPaths: paths,
              size: buffers.reduce((sum, buf) => sum + buf.length, 0),
              parts: paths.length,
              message: `Successfully converted markdown to ${result.format.toUpperCase()} (${paths.length} parts)`,
            }, null, 2),
          },
        ],
      };
    }

    // Write single file
    fs.writeFileSync(outputPath, result.buffer);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            format: result.format,
            outputPath,
            size: result.buffer.length,
            message: `Successfully converted markdown to ${result.format.toUpperCase()}`,
          }, null, 2),
        },
      ],
    };
  }

  private async handleListThemes(args: unknown) {
    ListThemesSchema.parse(args);

    const themes = registry.themes.map((t) => ({
      id: t.id,
      category: t.category,
      featured: t.featured,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            themes,
            count: themes.length,
          }, null, 2),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);

    // Keep the process running
    process.stdin.resume();
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

export async function startMcpServer(): Promise<void> {
  const server = new MarkdownMcpServer();
  await server.run();
}
