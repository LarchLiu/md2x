/**
 * Markdown Tools - Heading Numbering, Markdown Linting, etc.
 * 
 * Multi-language support for heading numbering based on VSCode locale.
 * @see docs/dev/heading-numbering-design.md
 */

import * as vscode from 'vscode';
import { numberHeadings, removeHeadingNumbers } from '../tools/heading-numbering';
import { buildConfigFromMessages } from '../tools/heading-numbering-config';
import { fixMarkdown, getDiagnostics, type FixCategory, getCategoryDisplayName } from '../tools/markdown-linter';
import { MarkdownPreviewPanel } from './preview-panel';
import { isSupportedDocument } from './extension';
import type { HeadingNumberingConfig } from '../tools/heading-numbering';
import type { ExtensionCacheService } from './cache-service';
import { loadMessagesJsonWithFallback } from '../utils/i18n-messages';

/**
 * Resolve locale for tools.
 * - If user selected a locale in settings, use it
 * - If 'auto' or missing, follow VS Code UI language
 */
function getCurrentLocale(context: vscode.ExtensionContext): string {
  const settings = context.globalState.get<Record<string, unknown>>('storage.markdownViewerSettings') ?? {};
  const preferredLocale = settings.preferredLocale;
  if (typeof preferredLocale === 'string' && preferredLocale && preferredLocale !== 'auto') {
    return preferredLocale;
  }

  return vscode.env.language || 'en';
}

function getConfigForContext(extensionPath: string, context: vscode.ExtensionContext): HeadingNumberingConfig | null {
  const locale = getCurrentLocale(context);
  const messages = loadMessagesJsonWithFallback(extensionPath, locale);
  
  if (!messages) {
    return null;
  }
  
  return buildConfigFromMessages(messages);
}

/**
 * Register number headings command
 */
export function registerNumberHeadingsCommand(
  context: vscode.ExtensionContext,
  cacheService: ExtensionCacheService
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.numberHeadings', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Please open a Markdown file first');
        return;
      }
      
      if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('This command only works with Markdown files');
        return;
      }
      
      const config = getConfigForContext(context.extensionPath, context);
      if (!config) {
        vscode.window.showErrorMessage('Failed to load numbering configuration');
        return;
      }
      
      const document = editor.document;
      const content = document.getText();
      const processed = numberHeadings(content, config);
      
      // Apply the changes
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      
      await editor.edit(editBuilder => {
        editBuilder.replace(fullRange, processed);
      });
      
      vscode.window.showInformationMessage('Headings numbered successfully');
    })
  );

  // Register open settings command
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.openSettings', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && isSupportedDocument(editor.document)) {
        // Use createOrShowWithSettings which handles both cases:
        // - If panel exists and webview is ready: opens settings immediately
        // - If panel is new or webview not ready: opens settings when ready
        MarkdownPreviewPanel.createOrShowWithSettings(
          context.extensionUri, 
          editor.document, 
          cacheService,
          vscode.ViewColumn.Beside
        );
      } else {
        vscode.window.showWarningMessage('Please open a Markdown file first');
      }
    })
  );

  // Register remove heading numbers command
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.removeHeadingNumbers', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Please open a Markdown file first');
        return;
      }
      
      if (editor.document.languageId !== 'markdown') {
        vscode.window.showWarningMessage('This command only works with Markdown files');
        return;
      }
      
      const config = getConfigForContext(context.extensionPath, context);
      if (!config) {
        vscode.window.showErrorMessage('Failed to load configuration');
        return;
      }
      
      const document = editor.document;
      const content = document.getText();
      const processed = removeHeadingNumbers(content, config);
      
      if (processed === content) {
        vscode.window.showInformationMessage('No heading numbers found to remove');
        return;
      }
      
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      
      await editor.edit(editBuilder => {
        editBuilder.replace(fullRange, processed);
      });
      
      vscode.window.showInformationMessage('Heading numbers removed successfully');
    })
  );

  // Register fix commands for each category
  registerFixCommands(context);
}

/**
 * Helper to apply fixes to the active editor
 */
async function applyFix(category: FixCategory): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Please open a Markdown file first');
    return;
  }
  
  if (editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage('This command only works with Markdown files');
    return;
  }
  
  const document = editor.document;
  const content = document.getText();
  const result = fixMarkdown(content, category);
  
  if (!result.changed) {
    const categoryName = getCategoryDisplayName(category);
    vscode.window.showInformationMessage(`No ${categoryName.toLowerCase()} issues found to fix`);
    return;
  }
  
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(content.length)
  );
  
  await editor.edit(editBuilder => {
    editBuilder.replace(fullRange, result.content);
  });
  
  const categoryName = getCategoryDisplayName(category);
  vscode.window.showInformationMessage(
    `Fixed ${result.issuesFixed} ${categoryName.toLowerCase()} issue(s)`
  );
}

/**
 * Register all fix commands
 */
function registerFixCommands(context: vscode.ExtensionContext): void {
  // Fix All Issues
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixAll', () => applyFix('all'))
  );

  // Fix Whitespace
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixWhitespace', () => applyFix('whitespace'))
  );

  // Fix Headings
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixHeadings', () => applyFix('headings'))
  );

  // Fix Lists
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixLists', () => applyFix('lists'))
  );

  // Fix Code Blocks
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixCode', () => applyFix('code'))
  );

  // Fix Links
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixLinks', () => applyFix('links'))
  );

  // Fix Emphasis
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixEmphasis', () => applyFix('emphasis'))
  );

  // Fix Tables
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixTables', () => applyFix('tables'))
  );

  // Fix Blockquotes
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixBlockquotes', () => applyFix('blockquotes'))
  );

  // Fix Proper Names
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.fixProperNames', () => applyFix('properNames'))
  );

  // Show Diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand('markdownViewer.tools.showDiagnostics', showDiagnostics)
  );
}

/**
 * Show diagnostics for the current Markdown file
 */
async function showDiagnostics(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Please open a Markdown file first');
    return;
  }
  
  if (editor.document.languageId !== 'markdown') {
    vscode.window.showWarningMessage('This command only works with Markdown files');
    return;
  }
  
  const document = editor.document;
  const content = document.getText();
  const errors = getDiagnostics(content);
  
  if (errors.length === 0) {
    vscode.window.showInformationMessage('No Markdown issues found');
    return;
  }
  
  // Create diagnostic collection if not exists
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('markdownlint');
  
  const diagnostics: vscode.Diagnostic[] = errors.map(error => {
    const line = error.lineNumber - 1; // Convert to 0-based
    const range = new vscode.Range(
      line, 
      error.errorRange ? error.errorRange[0] - 1 : 0,
      line, 
      error.errorRange ? error.errorRange[0] - 1 + (error.errorRange[1] || 1) : 1000
    );
    
    const severity = error.fixInfo 
      ? vscode.DiagnosticSeverity.Warning 
      : vscode.DiagnosticSeverity.Information;
    
    const message = `${error.ruleNames.join('/')} ${error.ruleDescription}`;
    const diagnostic = new vscode.Diagnostic(range, message, severity);
    diagnostic.source = 'markdownlint';
    diagnostic.code = error.ruleNames[0];
    
    return diagnostic;
  });
  
  diagnosticCollection.set(document.uri, diagnostics);
  
  // Show summary
  const fixableCount = errors.filter(e => e.fixInfo !== null).length;
  vscode.window.showInformationMessage(
    `Found ${errors.length} issue(s), ${fixableCount} auto-fixable`
  );
}
