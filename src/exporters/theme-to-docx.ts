/**
 * Theme to DOCX Converter
 * Converts theme configuration to DOCX styles
 */

import themeManager from '../utils/theme-manager';
import { BorderStyle } from 'docx';
import type {
  DOCXThemeStyles,
  DOCXRunStyle,
  DOCXParagraphStyle,
  DOCXParagraphSpacing,
  DOCXHeadingStyle,
  DOCXCharacterStyle,
  DOCXTableStyle,
  DOCXTableBorders,
  DOCXBorder,
  DOCXCodeColors,
  BorderStyleValue,
} from '../types/docx';
import type { ColorScheme } from '../types/index';

// Re-export DOCXThemeStyles for backward compatibility
export type { DOCXThemeStyles };

// ============================================================================
// Input Type Definitions (from theme files)
// ============================================================================

/**
 * Heading style configuration (font-related properties only)
 */
interface HeadingConfig {
  fontFamily?: string;
  fontWeight?: string;
}

/**
 * Font scheme configuration (font-related properties only)
 * Layout properties (fontSize, lineHeight, spacing) are in LayoutScheme
 * Color properties are in ColorScheme
 */
interface FontScheme {
  body: {
    fontFamily: string;
  };
  headings: Record<string, HeadingConfig>;
  code: {
    fontFamily: string;
  };
}

/**
 * Theme configuration
 */
interface ThemeConfig {
  fontScheme: FontScheme;
  layoutScheme: string;
  tableStyle: string;
  codeTheme: string;
}

/**
 * Layout scheme heading configuration
 */
interface LayoutHeadingConfig {
  fontSize: string;
  spacingBefore: string;
  spacingAfter: string;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Layout scheme block configuration
 */
interface LayoutBlockConfig {
  spacingBefore?: string;
  spacingAfter?: string;
  paddingVertical?: string;
  paddingHorizontal?: string;
}

/**
 * Layout scheme configuration (absolute pt values)
 */
interface LayoutScheme {
  id: string;
  name: string;
  name_en: string;
  description: string;
  description_en?: string;
  
  body: {
    fontSize: string;
    lineHeight: number;
  };
  
  headings: {
    h1: LayoutHeadingConfig;
    h2: LayoutHeadingConfig;
    h3: LayoutHeadingConfig;
    h4: LayoutHeadingConfig;
    h5: LayoutHeadingConfig;
    h6: LayoutHeadingConfig;
  };
  
  code: {
    fontSize: string;
  };
  
  blocks: {
    paragraph: LayoutBlockConfig;
    list: LayoutBlockConfig;
    listItem: LayoutBlockConfig;
    blockquote: LayoutBlockConfig;
    codeBlock: LayoutBlockConfig;
    table: LayoutBlockConfig;
    horizontalRule: LayoutBlockConfig;
  };
}

/**
 * Border configuration (layout properties only, color from ColorScheme)
 */
interface BorderConfig {
  style: string;
  width: string;
}

/**
 * Table style configuration (layout properties only, colors from ColorScheme)
 */
interface TableStyleConfig {
  border?: {
    all?: BorderConfig;
    headerTop?: BorderConfig;
    headerBottom?: BorderConfig;
    rowBottom?: BorderConfig;
    lastRowBottom?: BorderConfig;
  };
  header: {
    fontWeight?: string;
  };
  cell: {
    padding: string;
  };
  zebra?: {
    enabled: boolean;
  };
}

/**
 * Code theme configuration (from code theme JSON)
 */
interface CodeThemeConfig {
  colors: Record<string, string>;
  foreground?: string;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Convert theme configuration to DOCX styles object
 * @param theme - Theme configuration object
 * @param layoutScheme - Layout scheme configuration
 * @param colorScheme - Color scheme configuration
 * @param tableStyle - Table style configuration
 * @param codeTheme - Code highlighting theme
 * @returns DOCX styles configuration
 */
export function themeToDOCXStyles(
  theme: ThemeConfig,
  layoutScheme: LayoutScheme,
  colorScheme: ColorScheme,
  tableStyle: TableStyleConfig,
  codeTheme: CodeThemeConfig
): DOCXThemeStyles {
  return {
    default: generateDefaultStyle(theme.fontScheme, layoutScheme),
    paragraphStyles: generateParagraphStyles(theme.fontScheme, layoutScheme, colorScheme),
    characterStyles: generateCharacterStyles(theme.fontScheme, layoutScheme, colorScheme),
    tableStyles: generateTableStyles(tableStyle, colorScheme),
    codeColors: generateCodeColors(codeTheme, colorScheme),
    linkColor: colorScheme.accent.link.replace('#', ''),
    blockquoteColor: colorScheme.blockquote.border.replace('#', '')
  };
}

/**
 * Generate default document style
 * @param fontScheme - Font scheme configuration (font families)
 * @param layoutScheme - Layout scheme configuration (sizes and spacing)
 * @returns Default style configuration
 */
function generateDefaultStyle(
  fontScheme: FontScheme,
  layoutScheme: LayoutScheme
): { run: DOCXRunStyle; paragraph: DOCXParagraphStyle } {
  const bodyFont = fontScheme.body.fontFamily;
  const fontSize = themeManager.ptToHalfPt(layoutScheme.body.fontSize);
  
  // Line spacing in DOCX: 240 = single spacing, 360 = 1.5 spacing, 480 = double spacing
  const lineSpacing = Math.round(layoutScheme.body.lineHeight * 240);
  
  // Calculate the extra space added by line spacing (beyond 100%)
  const lineSpacingExtra = lineSpacing - 240;
  
  // Get paragraph spacing from layout scheme (absolute pt values)
  const paragraphBlock = layoutScheme.blocks.paragraph;
  const spacingBeforePt = parseFloat(paragraphBlock.spacingBefore || '0pt');
  const spacingAfterPt = parseFloat(paragraphBlock.spacingAfter || '0pt');
  
  // Convert to twips and compensate for line spacing
  const beforeSpacing = themeManager.ptToTwips(spacingBeforePt + 'pt') + Math.round(lineSpacingExtra / 2);
  const afterSpacing = Math.max(0, themeManager.ptToTwips(spacingAfterPt + 'pt') - Math.round(lineSpacingExtra / 2));
  
  // For DOCX: get font configuration from font-config.json
  const docxFont = themeManager.getDocxFont(bodyFont);

  return {
    run: {
      font: docxFont,
      size: fontSize
    },
    paragraph: {
      spacing: {
        line: lineSpacing,
        before: beforeSpacing,
        after: afterSpacing
      }
    }
  };
}

/**
 * Generate paragraph styles for headings
 * @param fontScheme - Font scheme configuration (font families, fontWeight)
 * @param layoutScheme - Layout scheme configuration (sizes, alignment, spacing)
 * @param colorScheme - Color scheme configuration (including heading colors)
 * @returns Paragraph styles
 */
function generateParagraphStyles(
  fontScheme: FontScheme,
  layoutScheme: LayoutScheme,
  colorScheme: ColorScheme
): Record<string, DOCXHeadingStyle> {
  const styles: Record<string, DOCXHeadingStyle> = {};

  // Heading levels
  const headingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
  
  headingLevels.forEach((level, index) => {
    const headingLevel = index + 1; // h1 = 1, h2 = 2, etc.
    const fontHeading = fontScheme.headings[level] as { fontFamily?: string; fontWeight?: string } | undefined;
    const layoutHeading = layoutScheme.headings[level];

    // Font family priority: h1-h6 specific > headings default > body fallback
    const font = fontHeading?.fontFamily || fontScheme.headings.fontFamily || fontScheme.body.fontFamily;
    const docxFont = themeManager.getDocxFont(font);
    // Font weight priority: h1-h6 specific > headings default > 'bold'
    const headingFontWeight = fontHeading?.fontWeight ?? fontScheme.headings.fontWeight ?? 'bold';
    const isBold = headingFontWeight === 'bold';

    // Get heading's spacing from layoutScheme (absolute pt values)
    const headingBeforePt = parseFloat(layoutHeading.spacingBefore || '0pt');
    const headingAfterPt = parseFloat(layoutHeading.spacingAfter || '0pt');
    
    // Compensate for line spacing
    // Headings use 1.5x line spacing = 360, extra = 120
    const lineSpacingExtra = 360 - 240;
    
    const totalBefore = themeManager.ptToTwips(headingBeforePt + 'pt') + Math.round(lineSpacingExtra / 2);
    const totalAfter = Math.max(0, themeManager.ptToTwips(headingAfterPt + 'pt') - Math.round(lineSpacingExtra / 2));

    // Heading color: from colorScheme.headings if specified, otherwise use text.primary
    const headingColor = colorScheme.headings?.[level] || colorScheme.text.primary;

    styles[`heading${headingLevel}`] = {
      id: `Heading${headingLevel}`,
      name: `Heading ${headingLevel}`,
      basedOn: 'Normal',
      next: 'Normal',
      run: {
        size: themeManager.ptToHalfPt(layoutHeading.fontSize),
        bold: isBold,
        font: docxFont,
        color: headingColor.replace('#', '')
      },
      paragraph: {
        spacing: {
          before: totalBefore,
          after: totalAfter,
          line: 360 // 1.5 line spacing for headings
        },
        alignment: layoutHeading.alignment || 'left'
      }
    };
  });

  return styles;
}

/**
 * Generate character styles (for inline elements)
 * @param fontScheme - Font scheme configuration (font families)
 * @param layoutScheme - Layout scheme configuration (sizes)
 * @param colorScheme - Color scheme configuration
 * @returns Character styles
 */
function generateCharacterStyles(
  fontScheme: FontScheme,
  layoutScheme: LayoutScheme,
  colorScheme: ColorScheme
): { code: DOCXCharacterStyle } {
  const codeFont = fontScheme.code.fontFamily;
  // Use colorScheme for code background color
  const codeBackground = colorScheme.background.code.replace('#', '');
  const docxFont = themeManager.getDocxFont(codeFont);

  return {
    code: {
      font: docxFont,
      size: themeManager.ptToHalfPt(layoutScheme.code.fontSize),
      background: codeBackground
    }
  };
}

/**
 * Generate table styles for DOCX
 * @param tableStyle - Table style configuration (layout only)
 * @param colorScheme - Color scheme configuration (colors)
 * @returns Table style configuration
 */
function generateTableStyles(tableStyle: TableStyleConfig, colorScheme: ColorScheme): DOCXTableStyle {
  const docxTableStyle: DOCXTableStyle = {
    borders: {},
    header: {},
    cell: {},
    zebra: tableStyle.zebra?.enabled || false
  };

  // Use colorScheme for border color
  const borderColor = colorScheme.table.border.replace('#', '');

  // Convert borders based on what's defined in the border object
  const border = tableStyle.border || {};

  // If border.all is defined, apply to all borders
  if (border.all) {
    docxTableStyle.borders.all = {
      style: convertBorderStyle(border.all.style),
      size: parseBorderWidth(border.all.width, border.all.style),
      color: borderColor
    };
  }

  // Override with specific borders if defined
  if (border.headerTop) {
    docxTableStyle.borders.headerTop = {
      style: convertBorderStyle(border.headerTop.style),
      size: parseBorderWidth(border.headerTop.width, border.headerTop.style),
      color: borderColor
    };
  }
  if (border.headerBottom) {
    docxTableStyle.borders.headerBottom = {
      style: convertBorderStyle(border.headerBottom.style),
      size: parseBorderWidth(border.headerBottom.width, border.headerBottom.style),
      color: borderColor
    };
  }
  if (border.rowBottom) {
    docxTableStyle.borders.insideHorizontal = {
      style: convertBorderStyle(border.rowBottom.style),
      size: parseBorderWidth(border.rowBottom.width, border.rowBottom.style),
      color: borderColor
    };
  }
  if (border.lastRowBottom) {
    docxTableStyle.borders.lastRowBottom = {
      style: convertBorderStyle(border.lastRowBottom.style),
      size: parseBorderWidth(border.lastRowBottom.width, border.lastRowBottom.style),
      color: borderColor
    };
  }

  // Header styles - use colorScheme for colors
  docxTableStyle.header.shading = {
    fill: colorScheme.table.headerBackground.replace('#', '')
  };
  docxTableStyle.header.color = colorScheme.table.headerText.replace('#', '');
  if (tableStyle.header.fontWeight) {
    docxTableStyle.header.bold = tableStyle.header.fontWeight === 'bold';
  }

  // Cell padding
  const paddingTwips = themeManager.ptToTwips(tableStyle.cell.padding);
  docxTableStyle.cell.margins = {
    top: paddingTwips,
    bottom: paddingTwips,
    left: paddingTwips,
    right: paddingTwips
  };

  // Zebra stripes - use colorScheme for colors
  if (tableStyle.zebra?.enabled) {
    docxTableStyle.zebra = {
      even: colorScheme.table.zebraEven.replace('#', ''),
      odd: colorScheme.table.zebraOdd.replace('#', '')
    };
  }

  return docxTableStyle;
}

/**
 * Generate code color mappings for DOCX export
 * @param codeTheme - Code highlighting theme
 * @param colorScheme - Color scheme configuration
 * @returns Code color mappings
 */
function generateCodeColors(codeTheme: CodeThemeConfig, colorScheme: ColorScheme): DOCXCodeColors {
  const colorMap: Record<string, string> = {};

  // Convert color mappings
  Object.keys(codeTheme.colors).forEach((token) => {
    colorMap[token] = codeTheme.colors[token];
  });

  return {
    background: colorScheme.background.code.replace('#', ''),
    foreground: codeTheme.foreground?.replace('#', '') || '24292e',
    colors: colorMap
  };
}

/**
 * Convert CSS border style to DOCX border style
 * @param cssStyle - CSS border style (e.g., 'solid', 'dashed')
 * @returns DOCX BorderStyle enum value
 */
function convertBorderStyle(cssStyle: string): BorderStyleValue {
  const styleMap: Record<string, BorderStyleValue> = {
    'none': BorderStyle.NONE,
    'solid': BorderStyle.SINGLE,
    'dashed': BorderStyle.DASHED,
    'dotted': BorderStyle.DOTTED,
    'double': BorderStyle.DOUBLE
  };

  return styleMap[cssStyle] || BorderStyle.SINGLE;
}

/**
 * Parse border width from CSS value to DOCX eighths of a point
 * @param width - CSS width (e.g., '1pt', '2px')
 * @param _style - Border style (optional, for future use)
 * @returns Width in eighths of a point
 */
function parseBorderWidth(width: string, _style: string = 'single'): number {
  const match = width.match(/^(\d+\.?\d*)(pt|px)$/);
  if (!match) return 8; // Default 1pt = 8 eighths

  const value = parseFloat(match[1]);
  const unit = match[2];

  // Keep original width for all border styles
  // DOCX will handle the double border rendering internally

  if (unit === 'pt') {
    return Math.round(value * 8);
  } else if (unit === 'px') {
    // Convert px to pt first (96 DPI: 1px = 0.75pt)
    const pt = value * 0.75;
    return Math.round(pt * 8);
  }

  return 8;
}

/**
 * Load and prepare complete theme configuration for DOCX export
 * @param themeId - Theme ID to load
 * @returns DOCX styles configuration
 */
export async function loadThemeForDOCX(themeId: string): Promise<DOCXThemeStyles> {
  try {
    // Initialize theme manager first
    await themeManager.initialize();
    
    // Load theme preset
    const theme = (await themeManager.loadTheme(themeId)) as unknown as ThemeConfig & { colorScheme: string };

    // Get platform for resource loading
    const platform = globalThis.platform as { 
      platform?: string;
      resource: { 
        getURL: (path: string) => string;
        fetch: (path: string) => Promise<string>;
      } 
    } | undefined;
    
    if (!platform?.resource) {
      throw new Error('Platform resource service not available');
    }

    // Helper to fetch JSON resource
    // Each platform's ResourceService.fetch() handles platform-specific differences
    const fetchResource = async <T>(path: string): Promise<T> => {
      const content = await platform.resource.fetch(path);
      return JSON.parse(content) as T;
    };

    // Load layout scheme
    const layoutScheme = await fetchResource<LayoutScheme>(
      `themes/layout-schemes/${theme.layoutScheme}.json`
    );

    // Load color scheme
    const colorScheme = await fetchResource<ColorScheme>(
      `themes/color-schemes/${theme.colorScheme}.json`
    );

    // Load table style
    const tableStyle = await fetchResource<TableStyleConfig>(
      `themes/table-styles/${theme.tableStyle}.json`
    );

    // Load code theme
    const codeTheme = await fetchResource<CodeThemeConfig>(
      `themes/code-themes/${theme.codeTheme}.json`
    );

    // Generate DOCX styles
    return themeToDOCXStyles(theme, layoutScheme, colorScheme, tableStyle, codeTheme);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Error loading theme for DOCX:', errMsg);
    throw error;
  }
}
