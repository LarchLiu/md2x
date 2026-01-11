---
name: canvas
description: Create spatial node-based diagrams with free positioning. Best for mind maps, knowledge graphs, concept maps, and planning boards where precise spatial layout matters. Use JSON format with x/y coordinates. NOT for sequential flows (use mermaid) or data charts (use vega).
---

# JSON Canvas Visualizer

## When to Use

**✅ Use canvas when:**
- Mind map with free spatial arrangement
- Knowledge graph with custom node positioning
- Concept maps connecting ideas with edges
- Planning boards or brainstorming layouts
- Diagrams where spatial position carries meaning
- Need to embed file references or links in nodes
- Obsidian Canvas compatibility needed

**❌ Use other skills instead:**
- Sequential flowcharts or processes → **mermaid** (auto-layout)
- Hierarchical mindmaps → **mermaid** mindmap or **infographic** (hierarchy-mindmap-*)
- Data-driven charts → **vega**
- Visual timelines or roadmaps → **infographic** (sequence-timeline-*, sequence-roadmap-*)
- Complex graphs with auto-layout → **graphviz**

---

## Quick Start

1. **Define nodes** — Create logical entity representations
2. **Plan layout** — Arrange nodes spatially (use 100px grid)
3. **Connect edges** — Link nodes with typed relationships
4. **Apply styling** — Use colors and grouping for organization
5. **Output in markdown** — Wrap in code fence with `canvas` identifier

---

## Critical Syntax Rules

### 1. Structure Format
```canvas
{
  "nodes": [
    {"id": "n1", "type": "text", "text": "Node 1", "x": 0, "y": 0, "width": 120, "height": 50}
  ],
  "edges": []
}
```

### 2. Node Types
| Type | Required Fields | Purpose |
|------|----------------|---------|
| `text` | `text` | Display custom text content |
| `file` | `file` | Reference external files |
| `link` | `url` | External URL references |
| `group` | `label` | Visual container for grouping |

### 3. Required Node Attributes
All nodes require: `id`, `type`, `x`, `y`, `width`, `height`

### 4. Color Presets
| Value | Color |
|-------|-------|
| `"1"` | Red |
| `"2"` | Orange |
| `"3"` | Yellow |
| `"4"` | Green |
| `"5"` | Cyan |
| `"6"` | Purple |

### 5. Edge Connections
```json
{
  "id": "e1",
  "fromNode": "n1",
  "fromSide": "right",
  "toNode": "n2", 
  "toSide": "left",
  "toEnd": "arrow"
}
```

### 6. Coordinate System
- Origin (0,0) at top-left
- X increases to the right
- Y increases downward

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Nodes overlapping | Increase spacing (100+ px) |
| Edges not visible | Verify `fromNode`/`toNode` match node IDs |
| Invalid JSON | Check quotes and commas |
| IDs invalid | Use only a-z, A-Z, 0-9, -, _ |

---

## Output Format

````markdown
```canvas
{
  "nodes": [...],
  "edges": [...]
}
```
````

---

## Related Files

> For detailed syntax and advanced features, refer to references below:

- [syntax.md](references/syntax.md) — Complete attribute reference: node types, edge properties, group styling, and advanced examples

## Resources

- [JSON Canvas Specification](https://jsoncanvas.org/spec/1.0/)
