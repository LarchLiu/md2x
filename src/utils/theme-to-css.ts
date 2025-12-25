/**
 * Theme to CSS Converter
 * Converts theme configuration to CSS styles
 */

import themeManager from './theme-manager';
import { fetchJSON } from './fetch-utils';
import type { PlatformAPI } from '../types/index';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Get platform instance from global scope
 */
function getPlatform(): PlatformAPI {
  return globalThis.platform as PlatformAPI;
}

/**
 * Heading spacing configuration
 */
interface HeadingSpacing {
  before?: string;
  after?: string;
}

/**
 * Heading configuration
 */
interface HeadingConfig {
  fontFamily?: string;
  fontSize: string;
  fontWeight?: string;
  alignment?: 'left' | 'center' | 'right';
  spacing?: HeadingSpacing;
}

/**
 * Font scheme configuration
 */
interface FontScheme {
  body: {
    fontFamily: string;
    fontSize: string;
    lineHeight: number;
  };
  headings: Record<string, HeadingConfig>;
  code: {
    fontFamily: string;
    fontSize: string;
    background: string;
  };
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  fontScheme: FontScheme;
  tableStyle: string;
  codeTheme: string;
  spacing: string;
}

/**
 * Border configuration
 */
interface BorderConfig {
  style: string;
  width: string;
  color: string;
}

/**
 * Table style configuration
 */
export interface TableStyleConfig {
  border?: {
    all?: BorderConfig;
    headerTop?: BorderConfig;
    headerBottom?: BorderConfig;
    rowBottom?: BorderConfig;
    lastRowBottom?: BorderConfig;
  };
  header: {
    background?: string;
    fontWeight?: string;
    color?: string;
    fontSize?: string;
  };
  cell: {
    padding: string;
  };
  zebra?: {
    enabled: boolean;
    evenBackground: string;
    oddBackground: string;
  };
}

/**
 * Code theme configuration
 */
export interface CodeThemeConfig {
  colors: Record<string, string>;
  foreground: string;
}

/**
 * Blockquote spacing configuration
 */
interface BlockquoteSpacing {
  before: number;
  after: number;
  padding: {
    vertical: number;
    horizontal: number;
  };
}

/**
 * Horizontal rule spacing configuration
 */
interface HorizontalRuleSpacing {
  before: number;
  after: number;
}

/**
 * Spacing scheme configuration
 */
export interface SpacingScheme {
  paragraph: number;
  list: number;
  listItem: number;
  blockquote?: BlockquoteSpacing;
  horizontalRule?: HorizontalRuleSpacing;
}

/**
 * Font configuration for themeManager
 */
export interface FontConfig {
  [key: string]: unknown;
}

// ============================================================================
// CSS Generation Functions
// ============================================================================

/**
 * Convert theme configuration to CSS
 * @param theme - Theme configuration object
 * @param tableStyle - Table style configuration
 * @param codeTheme - Code highlighting theme
 * @param spacingScheme - Spacing scheme configuration
 * @returns CSS string
 */
export function themeToCSS(
  theme: ThemeConfig,
  tableStyle: TableStyleConfig,
  codeTheme: CodeThemeConfig,
  spacingScheme: SpacingScheme
): string {
  const css: string[] = [];

  // Font scheme
  css.push(generateFontCSS(theme.fontScheme));

  // Table style
  css.push(generateTableCSS(tableStyle));

  // Code highlighting
  css.push(generateCodeCSS(theme.fontScheme.code, codeTheme));

  // Spacing (pass body font size for ratio calculation)
  css.push(generateSpacingCSS(spacingScheme, theme.fontScheme.body.fontSize));

  return css.join('\n\n');
}

/**
 * Generate font-related CSS
 * @param fontScheme - Font scheme configuration
 * @returns CSS string
 */
function generateFontCSS(fontScheme: FontScheme): string {
  const css: string[] = [];

  // Body font
  const bodyFontFamily = themeManager.buildFontFamily(fontScheme.body.fontFamily);
  const bodyFontSize = themeManager.ptToPx(fontScheme.body.fontSize);
  const bodyLineHeight = fontScheme.body.lineHeight;

  css.push(`#markdown-content {
  font-family: ${bodyFontFamily};
  font-size: ${bodyFontSize};
  line-height: ${bodyLineHeight};
}`);

  // KaTeX math expressions - use body font size
  css.push(`.katex {
  font-size: ${bodyFontSize};
}`);

  // Headings
  const headings = fontScheme.headings;
  Object.keys(headings).forEach((level) => {
    const heading = headings[level];
    // Inherit font from body if not specified
    const fontFamily = themeManager.buildFontFamily(heading.fontFamily || fontScheme.body.fontFamily);
    const fontSize = themeManager.ptToPx(heading.fontSize);
    const fontWeight = heading.fontWeight || 'normal';
    const alignment = heading.alignment || 'left';

    const styles = [
      `  font-family: ${fontFamily};`,
      `  font-size: ${fontSize};`,
      `  font-weight: ${fontWeight};`
    ];

    if (alignment !== 'left') {
      styles.push(`  text-align: ${alignment};`);
    }

    if (heading.spacing) {
      if (heading.spacing.before && heading.spacing.before !== '0pt') {
        styles.push(`  margin-top: ${themeManager.ptToPx(heading.spacing.before)};`);
      }
      if (heading.spacing.after) {
        styles.push(`  margin-bottom: ${themeManager.ptToPx(heading.spacing.after)};`);
      }
    }

    css.push(`#markdown-content ${level} {
${styles.join('\n')}
}`);
  });

  // Code font
  const codeFontFamily = themeManager.buildFontFamily(fontScheme.code.fontFamily);
  const codeFontSize = themeManager.ptToPx(fontScheme.code.fontSize);
  const codeBackground = fontScheme.code.background;

  css.push(`#markdown-content code {
  font-family: ${codeFontFamily};
  font-size: ${codeFontSize};
  background-color: ${codeBackground};
}`);

  css.push(`#markdown-content pre {
  background-color: ${codeBackground};
}`);

  css.push(`#markdown-content pre code {
  font-family: ${codeFontFamily};
  font-size: ${codeFontSize};
  background-color: transparent;
}`);

  return css.join('\n\n');
}

/**
 * Generate table-related CSS
 * @param tableStyle - Table style configuration
 * @returns CSS string
 */
function generateTableCSS(tableStyle: TableStyleConfig): string {
  const css: string[] = [];

  // Base table styles
  css.push(`#markdown-content table {
  border-collapse: collapse;
  margin: 13px auto;
  overflow: auto;
}`);

  // Border styles
  const border = tableStyle.border || {};
  
  // Convert pt to px for border width
  const convertBorderWidth = (width: string): string => {
    if (width.endsWith('pt')) {
      return width.replace('pt', 'px');
    }
    return width;
  };
  
  // Convert CSS border style
  const convertBorderStyle = (style: string): string => {
    const styleMap: Record<string, string> = {
      'single': 'solid',
      'double': 'double',
      'dashed': 'dashed',
      'dotted': 'dotted',
      'solid': 'solid'
    };
    return styleMap[style] || 'solid';
  };
  
  // Calculate effective border width for CSS
  const calculateCssBorderWidth = (width: string, style: string): string => {
    const convertedWidth = convertBorderWidth(width);
    if (style === 'double') {
      const match = convertedWidth.match(/^(\d+\.?\d*)(.*)$/);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2];
        return `${value * 3}${unit}`; // 3x for double border
      }
    }
    return convertedWidth;
  };
  
  // Base cell styling
  css.push(`#markdown-content table th,
#markdown-content table td {
  padding: ${tableStyle.cell.padding};
}`);

  if (border.all) {
    // Full borders mode
    const borderWidth = calculateCssBorderWidth(border.all.width, border.all.style);
    const borderStyle = convertBorderStyle(border.all.style);
    const borderValue = `${borderWidth} ${borderStyle} ${border.all.color}`;
    css.push(`#markdown-content table th,
#markdown-content table td {
  border: ${borderValue};
}`);
  } else {
    // Horizontal-only mode
    css.push(`#markdown-content table th,
#markdown-content table td {
  border: none;
}`);

    // Special borders
    if (border.headerTop) {
      const width = calculateCssBorderWidth(border.headerTop.width, border.headerTop.style);
      const style = convertBorderStyle(border.headerTop.style);
      css.push(`#markdown-content table th {
  border-top: ${width} ${style} ${border.headerTop.color};
}`);
    }

    if (border.headerBottom) {
      const width = calculateCssBorderWidth(border.headerBottom.width, border.headerBottom.style);
      const style = convertBorderStyle(border.headerBottom.style);
      css.push(`#markdown-content table th {
  border-bottom: ${width} ${style} ${border.headerBottom.color};
}`);
    }

    if (border.rowBottom) {
      const width = calculateCssBorderWidth(border.rowBottom.width, border.rowBottom.style);
      const style = convertBorderStyle(border.rowBottom.style);
      css.push(`#markdown-content table td {
  border-bottom: ${width} ${style} ${border.rowBottom.color};
}`);
    }

    if (border.lastRowBottom) {
      const width = calculateCssBorderWidth(border.lastRowBottom.width, border.lastRowBottom.style);
      const style = convertBorderStyle(border.lastRowBottom.style);
      css.push(`#markdown-content table tr:last-child td {
  border-bottom: ${width} ${style} ${border.lastRowBottom.color};
}`);
    }
  }

  // Header styles
  const header = tableStyle.header;
  const headerStyles: string[] = [];

  if (header.background) {
    headerStyles.push(`  background-color: ${header.background};`);
  }

  if (header.fontWeight) {
    const fontWeight = header.fontWeight === 'bold' ? 'bold' : header.fontWeight;
    headerStyles.push(`  font-weight: ${fontWeight};`);
  }

  if (header.color) {
    headerStyles.push(`  color: ${header.color};`);
  }

  if (header.fontSize) {
    headerStyles.push(`  font-size: ${header.fontSize};`);
  }

  if (headerStyles.length > 0) {
    css.push(`#markdown-content table th {
${headerStyles.join('\n')}
}`);
  }

  // Zebra stripes
  if (tableStyle.zebra && tableStyle.zebra.enabled) {
    css.push(`#markdown-content table tr:nth-child(even) {
  background-color: ${tableStyle.zebra.evenBackground};
}`);

    css.push(`#markdown-content table tr:nth-child(odd) {
  background-color: ${tableStyle.zebra.oddBackground};
}`);
  }

  return css.join('\n\n');
}

/**
 * Generate code highlighting CSS
 * @param codeConfig - Code font configuration
 * @param codeTheme - Code highlighting theme
 * @returns CSS string
 */
function generateCodeCSS(
  codeConfig: { background: string },
  codeTheme: CodeThemeConfig
): string {
  const css: string[] = [];

  // Ensure highlight.js styles work properly
  css.push(`#markdown-content .hljs {
  background: ${codeConfig.background} !important;
  color: ${codeTheme.foreground};
}`);

  // Generate color mappings for syntax highlighting
  Object.keys(codeTheme.colors).forEach((token) => {
    const color = codeTheme.colors[token];
    // Remove # prefix if present
    const colorValue = color.startsWith('#') ? color.slice(1) : color;
    css.push(`#markdown-content .hljs-${token} {
  color: #${colorValue};
}`);
  });

  return css.join('\n\n');
}

/**
 * Generate spacing-related CSS
 * @param spacingScheme - Spacing scheme configuration (ratios relative to body font size)
 * @param bodyFontSize - Body font size (e.g., "12pt")
 * @returns CSS string
 */
function generateSpacingCSS(spacingScheme: SpacingScheme, bodyFontSize: string): string {
  const css: string[] = [];
  
  // Parse body font size to get base value in pt
  const baseFontSizePt = parseFloat(bodyFontSize);

  // Helper function to calculate spacing based on ratio
  const calcSpacing = (ratio: number): string => {
    if (ratio === 0) return '0';
    const ptValue = baseFontSizePt * ratio;
    return themeManager.ptToPx(ptValue + 'pt');
  };

  // Paragraph spacing
  css.push(`#markdown-content p {
  margin: ${calcSpacing(spacingScheme.paragraph)} 0;
}`);

  // List spacing
  css.push(`#markdown-content ul,
#markdown-content ol {
  margin: ${calcSpacing(spacingScheme.list)} 0;
}`);

  css.push(`#markdown-content li {
  margin: ${calcSpacing(spacingScheme.listItem)} 0;
}`);

  // Blockquote spacing - use paragraph spacing if not explicitly configured
  const bqBefore = spacingScheme.blockquote?.before ?? spacingScheme.paragraph;
  const bqAfter = spacingScheme.blockquote?.after ?? spacingScheme.paragraph;
  const bqPaddingVertical = spacingScheme.blockquote?.padding.vertical ?? 0.083;
  const bqPaddingHorizontal = spacingScheme.blockquote?.padding.horizontal ?? 1.083;

  css.push(`#markdown-content blockquote {
  margin: ${calcSpacing(bqBefore)} 0 ${calcSpacing(bqAfter)} 0;
  padding: ${calcSpacing(bqPaddingVertical)} ${calcSpacing(bqPaddingHorizontal)};
}`);

  // Horizontal rule spacing
  if (spacingScheme.horizontalRule) {
    const hr = spacingScheme.horizontalRule;
    css.push(`#markdown-content hr {
  margin: ${calcSpacing(hr.before)} 0 ${calcSpacing(hr.after)} 0;
}`);
  }

  return css.join('\n\n');
}

// ============================================================================
// Theme Application Functions
// ============================================================================

/**
 * Apply theme CSS to the page
 * @param css - CSS string to apply
 */
export function applyThemeCSS(css: string): void {
  // Remove existing theme style
  const existingStyle = document.getElementById('theme-dynamic-style');
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create and append new style element
  const styleElement = document.createElement('style');
  styleElement.id = 'theme-dynamic-style';
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
}

/**
 * Apply theme from pre-loaded data (used by mobile when Flutter sends theme data)
 * @param theme - Theme configuration
 * @param tableStyle - Table style configuration
 * @param codeTheme - Code theme configuration
 * @param spacingScheme - Spacing scheme configuration
 * @param fontConfig - Font configuration (for themeManager)
 */
export function applyThemeFromData(
  theme: ThemeConfig,
  tableStyle: TableStyleConfig,
  codeTheme: CodeThemeConfig,
  spacingScheme: SpacingScheme,
  fontConfig?: FontConfig
): void {
  try {
    // Generate CSS
    const css = themeToCSS(theme, tableStyle, codeTheme, spacingScheme);

    // Apply CSS
    applyThemeCSS(css);
  } catch (error) {
    console.error('Error applying theme from data:', error);
    throw error;
  }
}

/**
 * Load and apply complete theme
 * @param themeId - Theme ID to load
 */
export async function loadAndApplyTheme(themeId: string): Promise<void> {
  try {
    const platform = getPlatform();
    
    // Load theme
    const theme = (await themeManager.loadTheme(themeId)) as unknown as ThemeConfig;

    // Load table style
    const tableStyle = await fetchJSON(
      platform.resource.getURL(`themes/table-styles/${theme.tableStyle}.json`)
    ) as TableStyleConfig;

    // Load code theme
    const codeTheme = await fetchJSON(
      platform.resource.getURL(`themes/code-themes/${theme.codeTheme}.json`)
    ) as CodeThemeConfig;

    // Load spacing scheme
    const spacingScheme = await fetchJSON(
      platform.resource.getURL(`themes/spacing-schemes/${theme.spacing}.json`)
    ) as SpacingScheme;

    // Generate CSS
    const css = themeToCSS(theme, tableStyle, codeTheme, spacingScheme);

    // Apply CSS
    applyThemeCSS(css);
  } catch (error) {
    console.error('Error loading theme:', error);
    throw error;
  }
}

/**
 * Switch to a different theme with smooth transition
 * @param themeId - Theme ID to switch to
 * @returns Success status
 */
export async function switchTheme(themeId: string): Promise<boolean> {
  try {
    // Switch theme in manager
    await themeManager.switchTheme(themeId);
    
    // Apply theme CSS
    await loadAndApplyTheme(themeId);
    
    return true;
  } catch (error) {
    console.error('Error switching theme:', error);
    throw error;
  }
}
