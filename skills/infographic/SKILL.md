---
name: infographic
description: Create beautiful infographics with pre-designed templates. Best for KPI cards, timelines, roadmaps, step-by-step processes, A vs B comparisons, SWOT analysis, funnels, org trees, pie/bar charts. Use when you need quick visual impact with 4-8 items. Simple YAML-like syntax. NOT for complex data analysis (use vega) or technical flowcharts (use mermaid).
---

# Infographic Visualizer

> **⚠️ CRITICAL - READ BEFORE GENERATING CODE:**
> 1. Read this **ENTIRE document** (all 450+ lines, not just the first 50)
> 2. Check the **"Available Templates"** section for valid template names
> 3. Follow the **"Critical Rules"** and **"Common Pitfalls"** sections strictly
> 4. Refer to `references/templates.md` and `references/examples.md` for detailed usage
>
> **Partial reading WILL cause:** invalid template names, wrong syntax, missing required fields, and render failures.

## When to Use

**✅ Use infographic when:**
- Feature list / checklist (`list-column-done-list`, `list-row-*`)
- KPI cards / metrics grid (`list-grid-badge-card`)
- Timeline / milestones (`sequence-timeline-*`)
- Step-by-step process (`sequence-snake-steps-*`, `sequence-stairs-*`)
- Product roadmap (`sequence-roadmap-vertical-*`)
- Funnel / conversion (`sequence-filter-mesh-simple`, `sequence-funnel-simple`)
- A vs B comparison (`compare-binary-horizontal-*`)
- SWOT analysis (`compare-swot`)
- Priority matrix 2×2 (`quadrant-quarter-*`)
- Org tree (`hierarchy-tree-*`, `hierarchy-structure`)
- Pie / donut chart (`chart-pie-*`, `chart-pie-donut-*`)
- Bar / column chart (`chart-bar-*`, `chart-column-*`)
- Word cloud (`chart-wordcloud`)
- Content has 4-8 items for optimal visual balance

**❌ Use other skills instead:**
- Complex data analysis with 20+ data points → **vega**
- Technical flowcharts with decision logic → **mermaid**
- API sequences or state machines → **mermaid**
- Complex dependency graphs → **graphviz**
- Free spatial positioning → **canvas**

---

## Overview

Infographic transforms data and information into visual infographics using a simple, mermaid-like DSL syntax.

`Infographic = Information Structure + Visual Expression`

**Live Gallery:** [AntV Infographic Gallery](https://infographic.antv.vision/examples)

---

## Syntax Structure

```plain
infographic <template-name>
data
  title Title
  desc Description
  items
    - label Label
      value 12.5
      desc Explanation
      icon mdi/rocket-launch
theme
  palette #3b82f6 #8b5cf6 #f97316
```

### Key Rules

1. **First line**: `infographic <template-name>` — template must be from the Available Templates list
2. **Indentation**: Two spaces per level
3. **Key-value pairs**: `key value` (space separated)
4. **Arrays**: Use `-` prefix for items
5. **Icon format**: `mdi/icon-name` (from Iconify, e.g., `mdi/chart-line`)

---

## Data Field Reference

### TypeScript Definition
```ts
interface Data {
  title?: string;
  desc?: string;
  items: ItemDatum[];
}

interface ItemDatum {
  icon?: string;      // e.g., "mdi/chart-line"
  label?: string;     // Item title (Required for most templates)
  desc?: string;      // Description text
  value?: number;     // Numeric value (for charts/funnels)
  illus?: string;     // Illustration name (from unDraw)
  children?: ItemDatum[];  // Nested items (for hierarchy/compare)
}
```

### Common Fields
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `label` | string | Item title/name | `label Q1 Sales` |
| `desc` | string | Description text | `desc 12.8 亿元 | +20%` |
| `value` | number | Numeric value (charts/funnels only) | `value 128` |
| `icon` | string | Icon from Iconify | `icon mdi/star` |
| `illus` | string | Illustration from unDraw | `illus coding` |
| `children` | array | Nested items | For hierarchy/compare |
| `time` | string | Time label (timeline) | `time 2024-Q1` |
| `done` | boolean | Completion status | `done true` |

### Icon Resources (from Iconify)
- Format: `<collection>/<icon-name>`
- Popular collections: `mdi/*`, `fa/*`, `bi/*`, `heroicons/*`
- Browse: https://icon-sets.iconify.design/
- Examples: `mdi/code-tags`, `mdi/chart-line`, `mdi/account-group`

### Illustration Resources (from unDraw)
- Format: illustration filename without .svg
- Browse: https://undraw.co/illustrations
- Examples: `coding`, `team-work`, `analytics`

---

## Available Templates

### List (`list-*`) — For listing items/features
- `list-grid-badge-card` — Grid cards with badges ⭐
- `list-grid-candy-card-lite` — Colorful grid cards
- `list-grid-ribbon-card` — Cards with ribbon decoration
- `list-row-horizontal-icon-arrow` — Horizontal row with arrows
- `list-row-simple-illus` — Row with illustrations
- `list-sector-plain-text` — Radial sector layout
- `list-column-done-list` — Checklist with checkmarks ⭐
- `list-column-vertical-icon-arrow` — Vertical with arrows
- `list-column-simple-vertical-arrow` — Simple vertical arrows
- `list-zigzag-down-compact-card` — Zigzag down cards
- `list-zigzag-down-simple` — Simple zigzag down
- `list-zigzag-up-compact-card` — Zigzag up cards
- `list-zigzag-up-simple` — Simple zigzag up

### Sequence (`sequence-*`) — For processes/timelines
- `sequence-timeline-simple` — Simple timeline ⭐
- `sequence-timeline-rounded-rect-node` — Timeline with rounded nodes
- `sequence-timeline-simple-illus` — Timeline with illustrations
- `sequence-roadmap-vertical-simple` — Vertical roadmap ⭐
- `sequence-roadmap-vertical-plain-text` — Plain text roadmap
- `sequence-filter-mesh-simple` — Funnel chart ⭐
- `sequence-funnel-simple` — Simple funnel
- `sequence-snake-steps-simple` — Snake path steps
- `sequence-snake-steps-compact-card` — Snake with cards
- `sequence-snake-steps-underline-text` — Snake with underline
- `sequence-stairs-front-compact-card` — Front stairs cards
- `sequence-stairs-front-pill-badge` — Stairs with badges
- `sequence-ascending-steps` — Ascending steps
- `sequence-ascending-stairs-3d-underline-text` — 3D stairs
- `sequence-circular-simple` — Circular flow
- `sequence-pyramid-simple` — Pyramid structure
- `sequence-mountain-underline-text` — Mountain milestones
- `sequence-cylinders-3d-simple` — 3D cylinders
- `sequence-zigzag-steps-underline-text` — Zigzag steps
- `sequence-zigzag-pucks-3d-simple` — 3D pucks zigzag
- `sequence-horizontal-zigzag-underline-text` — Horizontal zigzag
- `sequence-horizontal-zigzag-simple-illus` — Zigzag illustrations
- `sequence-color-snake-steps-horizontal-icon-line` — Colorful snake

### Compare (`compare-*`) — For comparisons
- `compare-binary-horizontal-underline-text-vs` — A vs B comparison ⭐
- `compare-binary-horizontal-simple-fold` — Folded comparison
- `compare-binary-horizontal-badge-card-arrow` — Badge cards with arrows
- `compare-hierarchy-left-right-circle-node-pill-badge` — Hierarchy comparison
- `compare-swot` — SWOT analysis (4 quadrants) ⭐

### Hierarchy (`hierarchy-*`) — For org charts/trees
- `hierarchy-tree-tech-style-capsule-item` — Tech style tree ⭐
- `hierarchy-tree-curved-line-rounded-rect-node` — Curved tree
- `hierarchy-tree-tech-style-badge-card` — Tree with badge cards
- `hierarchy-structure` — Generic hierarchy (max 3 levels)

### Chart (`chart-*`) — For data visualization
- `chart-pie-plain-text` — Pie chart
- `chart-pie-compact-card` — Pie with cards
- `chart-pie-donut-plain-text` — Donut chart ⭐
- `chart-pie-donut-pill-badge` — Donut with badges
- `chart-bar-plain-text` — Horizontal bar chart
- `chart-column-simple` — Vertical column chart
- `chart-line-plain-text` — Line chart
- `chart-wordcloud` — Word cloud

### Quadrant (`quadrant-*`) — For 2x2 matrices
- `quadrant-quarter-simple-card` — Quadrant cards ⭐
- `quadrant-quarter-circular` — Circular quadrant
- `quadrant-simple-illus` — Illustrated quadrant

### Relation (`relation-*`) — For relationships
- `relation-circle-icon-badge` — Circle with badges
- `relation-circle-circular-progress` — Circular progress

---

## Template Selection Guidelines

| Use Case | Recommended Templates |
|----------|----------------------|
| Feature list / KPIs | `list-grid-badge-card` |
| Checklist | `list-column-done-list` |
| Timeline / History | `sequence-timeline-simple` |
| Roadmap / Planning | `sequence-roadmap-vertical-simple` |
| Process steps | `sequence-snake-steps-simple` |
| Sales funnel | `sequence-filter-mesh-simple` |
| A vs B comparison | `compare-binary-horizontal-underline-text-vs` |
| SWOT analysis | `compare-swot` |
| Org chart / Tree | `hierarchy-tree-tech-style-capsule-item` |
| Pie/Donut chart | `chart-pie-donut-plain-text` |
| Priority matrix | `quadrant-quarter-simple-card` |

---

## Core Examples

### Feature Grid (list-grid-badge-card)
```infographic
infographic list-grid-badge-card
data
  title Key Metrics
  desc Annual performance overview
  items
    - label Total Revenue
      desc 12.8 亿元 | YoY +23.5%
    - label New Customers
      desc 3280 | YoY +45%
    - label Satisfaction
      desc 94.6% | Industry leading
    - label Market Share
      desc 18.5% | Rank #2
```

### Timeline (sequence-timeline-simple)
```infographic
infographic sequence-timeline-simple
data
  title Product Roadmap
  items
    - label Q1 2024
      desc Research phase
    - label Q2 2024
      desc Design phase
    - label Q3 2024
      desc Development
    - label Q4 2024
      desc Launch
```

### Funnel Chart (sequence-filter-mesh-simple)
```infographic
infographic sequence-filter-mesh-simple
data
  title Sales Funnel
  items
    - label Leads
      value 10000
      desc Market leads
    - label Qualified
      value 2500
      desc 25% conversion
    - label Proposals
      value 800
      desc 32% conversion
    - label Closed
      value 328
      desc 41% conversion
```

### Checklist (list-column-done-list)
```infographic
infographic list-column-done-list
data
  title Launch Checklist
  items
    - label Code review completed
      done true
    - label Tests passing
      done true
    - label Documentation updated
      done false
    - label Deploy to production
      done false
```

### A vs B Comparison (compare-binary-horizontal-underline-text-vs)
```infographic
infographic compare-binary-horizontal-underline-text-vs
data
  title Cloud vs On-Premise
  items
    - label Cloud
      children
        - label Scalable on demand
        - label Pay as you go
    - label On-Premise
      children
        - label Full control
        - label One-time cost
```

### SWOT Analysis (compare-swot)
Must have exactly 4 items with English labels: Strengths, Weaknesses, Opportunities, Threats
```infographic
infographic compare-swot
data
  title Strategic Analysis
  items
    - label Strengths
      children
        - label Strong R&D
        - label Complete supply chain
    - label Weaknesses
      children
        - label Limited brand awareness
        - label High costs
    - label Opportunities
      children
        - label Digital transformation
        - label Emerging markets
    - label Threats
      children
        - label Intense competition
        - label Market changes
```

### Pie/Donut Chart (chart-pie-donut-plain-text)
```infographic
infographic chart-pie-donut-plain-text
data
  title Revenue by Product
  items
    - label Enterprise Software
      value 42
    - label Cloud Services
      value 28
    - label Hardware
      value 18
    - label Services
      value 12
```

### Organization Tree (hierarchy-tree-tech-style-capsule-item)
```infographic
infographic hierarchy-tree-tech-style-capsule-item
data
  title Organization Structure
  items
    - label CEO
      children
        - label VP Engineering
          children
            - label Frontend Team
            - label Backend Team
        - label VP Product
          children
            - label Design
            - label Research
```

### With Theme Customization
```infographic
infographic list-row-horizontal-icon-arrow
theme dark
  palette
    - #61DDAA
    - #F6BD16
    - #F08BB4
data
  items
    - label Step 1
      desc Start
      icon mdi/play
    - label Step 2
      desc In Progress
      icon mdi/progress-clock
    - label Step 3
      desc Complete
      icon mdi/check
```

---

## Critical Rules

### Compare Templates: Exactly 2 Root Nodes
```plain
❌ 3+ root items
✅ Exactly 2 root items with children
```

### SWOT: Exactly 4 Root Nodes with English Labels
```plain
❌ 优势/劣势/机会/威胁
✅ Strengths/Weaknesses/Opportunities/Threats
```

### Value Field: Numbers Only (for charts/funnels)
```plain
❌ value "40%"
✅ value 40
```

### Icon Format: Collection/Name
```plain
❌ icon star
✅ icon mdi/star
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Won't render | Check indentation (2 spaces per level) |
| "Incomplete options" | Template doesn't support used fields, or missing required `label` |
| Compare broken | Ensure exactly 2 root items with `children` |
| SWOT incomplete | Must have exactly 4 items with English labels |
| Values not showing | Put values in `desc` for list templates, use `value` only for charts/funnels |
| Icons not showing | Use `icon mdi/icon-name` format |
| Hierarchy too deep | `hierarchy-structure` supports max 3 levels |

---

## Output Format

````markdown
```infographic
infographic <template-name>
data
  title Your Title
  items
    - label Item 1
      desc Description here
```
````

---

## Related Files

> For detailed syntax, templates, and examples, refer to references below:

- [syntax.md](references/syntax.md) — Complete syntax specification and rules
- [templates.md](references/templates.md) — All available templates with descriptions
- [examples.md](references/examples.md) — Full examples for each template category

## Resources

- [AntV Infographic Gallery](https://infographic.antv.vision/examples)
- [Iconify Icons](https://icon-sets.iconify.design/)
- [unDraw Illustrations](https://undraw.co/illustrations)
