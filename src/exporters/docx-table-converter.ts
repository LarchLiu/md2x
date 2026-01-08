// Table conversion for DOCX export

import {
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableCell,
  TableRow,
  BorderStyle,
  TableLayoutType,
  VerticalAlign as VerticalAlignTable,
  WidthType,
  convertInchesToTwip,
  type IBorderOptions,
  type IParagraphOptions,
  type ITableCellOptions,
  type ParagraphChild,
} from 'docx';
import type { DOCXThemeStyles, DOCXTableNode } from '../types/docx';
import type { InlineResult, InlineNode } from './docx-inline-converter';

type ConvertInlineNodesFunction = (children: InlineNode[], options?: { bold?: boolean; size?: number; color?: string }) => Promise<InlineResult[]>;

interface TableConverterOptions {
  themeStyles: DOCXThemeStyles;
  convertInlineNodes: ConvertInlineNodesFunction;
}

export interface TableConverter {
  convertTable(node: DOCXTableNode, listLevel?: number): Promise<Table>;
}

/**
 * Create a table converter
 * @param options - Configuration options
 * @returns Table converter
 */
export function createTableConverter({ themeStyles, convertInlineNodes }: TableConverterOptions): TableConverter {
  // Default table styles
  const defaultMargins = { top: 80, bottom: 80, left: 100, right: 100 };
  
  // Get table styles with defaults
  const tableStyles = themeStyles.tableStyles || {};
  const headerStyles = tableStyles.header || {};
  const cellStyles = tableStyles.cell || {};
  const borderStyles = tableStyles.borders || {};
  const zebraStyles = tableStyles.zebra;
  
  /**
   * Convert table node to DOCX Table
   * @param node - Table AST node
   * @param listLevel - List nesting level for indentation (default: 0)
   * @returns DOCX Table
   */
  async function convertTable(node: DOCXTableNode, listLevel = 0): Promise<Table> {
    const rows: TableRow[] = [];
    const alignments = (node as unknown as { align?: Array<'left' | 'center' | 'right' | null> }).align || [];
    const tableRows = (node.children || []).filter((row) => row.type === 'tableRow');
    const rowCount = tableRows.length;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
      const row = tableRows[rowIndex];
      const isHeaderRow = rowIndex === 0;
      const isLastRow = rowIndex === rowCount - 1;

      if (row.type === 'tableRow') {
        const cells: TableCell[] = [];

        const rowChildren = row.children || [];
        for (let colIndex = 0; colIndex < rowChildren.length; colIndex++) {
          const cell = rowChildren[colIndex];

          if (cell.type === 'tableCell') {
            const isBold = isHeaderRow && (headerStyles.bold ?? true);
            const headerColor = isHeaderRow && headerStyles.color ? headerStyles.color : undefined;
            const children = isHeaderRow
              ? await convertInlineNodes((cell.children || []) as InlineNode[], { bold: isBold, size: 20, color: headerColor })
              : await convertInlineNodes((cell.children || []) as InlineNode[], { size: 20 });

            const cellAlignment = alignments[colIndex];
            let paragraphAlignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
            if (isHeaderRow) {
              paragraphAlignment = AlignmentType.CENTER;
            } else if (cellAlignment === 'center') {
              paragraphAlignment = AlignmentType.CENTER;
            } else if (cellAlignment === 'right') {
              paragraphAlignment = AlignmentType.RIGHT;
            }

            const paragraphOptions: IParagraphOptions = {
              children: children as ParagraphChild[],
              alignment: paragraphAlignment,
              spacing: { before: 60, after: 60, line: 240 },
            };

            const whiteBorder: IBorderOptions = { style: BorderStyle.SINGLE, size: 0, color: 'FFFFFF' };
            const noneBorder: IBorderOptions = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
            const isFirstColumn = colIndex === 0;

            let borders: ITableCellOptions['borders'];

            if (borderStyles.all) {
              borders = {
                top: borderStyles.all,
                bottom: borderStyles.all,
                left: borderStyles.all,
                right: borderStyles.all
              };
            } else {
              borders = {
                top: whiteBorder,
                bottom: whiteBorder,
                left: isFirstColumn ? whiteBorder : noneBorder,
                right: noneBorder
              };
            }

            if (isHeaderRow && borderStyles.headerTop && borderStyles.headerTop.style !== BorderStyle.NONE) {
              borders = { ...(borders || {}), top: borderStyles.headerTop };
            }
            if (isHeaderRow && borderStyles.headerBottom && borderStyles.headerBottom.style !== BorderStyle.NONE) {
              borders = { ...(borders || {}), bottom: borderStyles.headerBottom };
            }
            if (!isHeaderRow) {
              if (isLastRow && borderStyles.lastRowBottom && borderStyles.lastRowBottom.style !== BorderStyle.NONE) {
                borders = { ...(borders || {}), bottom: borderStyles.lastRowBottom };
              } else if (borderStyles.insideHorizontal && borderStyles.insideHorizontal.style !== BorderStyle.NONE) {
                borders = { ...(borders || {}), bottom: borderStyles.insideHorizontal };
              }
            }

            let shading: ITableCellOptions['shading'];
            if (isHeaderRow && headerStyles.shading) {
              shading = headerStyles.shading;
            } else if (rowIndex > 0 && typeof zebraStyles === 'object') {
              const isOddDataRow = ((rowIndex - 1) % 2) === 0;
              const background = isOddDataRow ? zebraStyles.odd : zebraStyles.even;
              if (background !== 'ffffff' && background !== 'FFFFFF') {
                shading = { fill: background };
              }
            }

            const cellConfig: ITableCellOptions = {
              children: [new Paragraph(paragraphOptions)],
              verticalAlign: VerticalAlignTable.CENTER,
              margins: cellStyles.margins || defaultMargins,
              borders,
              shading,
            };

            cells.push(new TableCell(cellConfig));
          }
        }

        rows.push(new TableRow({
          children: cells,
          tableHeader: isHeaderRow,
        }));
      }
    }

    // For nested tables, add half the indent to the left margin and keep center alignment
    // This creates the visual effect of centering within the indented area
    const indentSize = listLevel > 0 ? convertInchesToTwip(0.5 * listLevel / 2) : undefined;

    return new Table({
      rows: rows,
      layout: TableLayoutType.AUTOFIT,
      alignment: AlignmentType.CENTER,
      indent: indentSize ? { size: indentSize, type: WidthType.DXA } : undefined,
    });
  }

  return { convertTable };
}
