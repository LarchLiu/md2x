---
name: vega
description: Create data-driven charts with Vega-Lite (simple) and Vega (advanced). Best for bar, line, scatter, heatmap, area charts, and multi-series analytics. Use when you have numeric data arrays needing statistical visualization. Vega for radar charts and word clouds. NOT for process diagrams (use mermaid) or quick KPI cards (use infographic).
---

# Vega / Vega-Lite Visualizer

## When to Use

**✅ Use vega when:**
- Bar / line / scatter chart (Vega-Lite for data encoding)
- Heatmap / area chart (Vega-Lite with color scale)
- Multi-series / faceted charts (Vega-Lite with layer/facet)
- Histograms and statistical distributions
- Statistical aggregations (sum, mean, count)
- Radar chart (Vega for advanced visuals)
- Word cloud with custom styling (Vega)
- Data-driven visualizations with 20+ data points

**❌ Use other skills instead:**
- Process flows, sequences → **mermaid**
- KPI cards, timelines, roadmaps → **infographic**
- Simple pie/bar/column charts (4-8 items) → **infographic** (chart-*)
- Simple word cloud → **infographic** (chart-wordcloud)
- Dependency graphs → **graphviz**
- Spatial node layouts → **canvas**

**Vega-Lite vs Vega:** Use Vega-Lite for 90% of charts. Use Vega only for radar, word cloud, force-directed, or custom interactions.

---

## Quick Start

1. **Identify data structure** — Array of objects with named fields
2. **Choose mark type** — bar, line, point, area, arc, rect, etc.
3. **Map encodings** — x, y, color, size, shape to data fields
4. **Set data types** — quantitative, nominal, ordinal, temporal
5. **Output in markdown** — Wrap in code fence with `vega-lite` or `vega`

**Default assumptions:**
- Always include `$schema` for version compatibility
- Use double quotes only (valid JSON)
- Field names are case-sensitive

---

## Critical Syntax Rules

### Rule 1: Always Include Schema
```json
"$schema": "https://vega.github.io/schema/vega-lite/v5.json"
```

### Rule 2: Valid JSON Only
```
❌ {field: "x",}     → Trailing comma, unquoted key
✅ {"field": "x"}    → Proper JSON
```

### Rule 3: Field Names Must Match Data
```
❌ "field": "Category"  when data has "category"
✅ "field": "category"  → Case-sensitive match
```

### Rule 4: Type Must Be Valid
```
✅ quantitative | nominal | ordinal | temporal
❌ numeric | string | date
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Chart not rendering | Check JSON validity, verify `$schema` |
| Data not showing | Field names must match exactly |
| Wrong chart type | Match mark to data structure |
| Colors not visible | Check color scale contrast |
| Dual-axis issues | Add `resolve: {scale: {y: "independent"}}` |

---

## Output Format

````markdown
```vega-lite
{...}
```
````

Or for full Vega:

````markdown
```vega
{...}
```
````

---

## Related Files

> For advanced chart patterns and complex visualizations, refer to references below:

- [examples.md](references/examples.md) — Stacked bar, grouped bar, multi-series line, area, heatmap, radar (Vega), word cloud (Vega), and interactive chart examples
