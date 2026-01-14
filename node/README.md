# md2x

Markdown → PDF/DOCX/HTML converter (local, no server). Supports Mermaid/Graphviz/Infographic/Vega/HTML/SVG rendering, math, and code highlighting.

[![npm version](https://img.shields.io/npm/v/md2x.svg?style=flat-square)](https://www.npmjs.com/package/md2x)

## Usage

Export to PDF:
```bash
npx md2x input.md
```

Export to DOCX:

```bash
npx md2x input.md -f docx
```

Export to HTML:

```bash
npx md2x input.md -f html
```

HTML diagram modes:

```bash
# Render diagrams in the browser on load (default)
# - uses online CDN scripts (Mermaid/@viz-js/viz/Vega-Lite/Infographic)
npx md2x input.md -f html --diagram-mode live

# Pre-render diagrams as embedded images (offline, stable)
npx md2x input.md -f html --diagram-mode img

# Render diagrams in the browser on load (keeps source blocks)
# Tip: Vega-Lite CDN major version is auto-selected from the spec $schema (v5 or v6).

# Keep diagram source blocks only (no rendering)
npx md2x input.md -f html --diagram-mode none
```

List themes:

```bash
npx md2x --list-themes
```

Use a theme:

```bash
npx md2x input.md -o output.pdf --theme academic
```

Help:

```bash
npx md2x -h
```

## Puppeteer / Chrome install

This package depends on `puppeteer`. On first install, Puppeteer downloads a compatible "Chrome for Testing" build (cached under your user directory). Set `PUPPETEER_SKIP_DOWNLOAD=1` to skip download and use a system Chrome via `PUPPETEER_EXECUTABLE_PATH`.

## Open Source License

This project is open source under ISC license. Welcome to Star, report issues, suggest features, and contribute code.

**Project URL:** https://github.com/LarchLiu/md2x

## Acknowledgements

- [markdown-viewer-extension](https://github.com/xicilion/markdown-viewer-extension) - Developed based on this project
