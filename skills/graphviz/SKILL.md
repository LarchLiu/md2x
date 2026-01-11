---
name: graphviz
description: Create complex directed/undirected graphs with precise layout control. Best for dependency trees, org charts, network topologies, and module relationships. Use when you need fine-grained edge routing or hierarchical layouts with many levels. NOT for simple flowcharts (use mermaid) or data charts (use vega).
---

# Graphviz DOT Diagram Generator

> **Important:** Use ` ```dot ` as the code fence identifier, NOT ` ```graphviz `.

## When to Use

**✅ Use graphviz when:**
- Dependencies / imports (directed graph with fine control)
- Org chart / hierarchy with many levels (tree layout)
- Network topology (complex edge routing)
- Call graphs and module relationships
- Fine-grained layout control needed (rankdir, splines, rank)
- Record-based structured nodes
- HTML labels for rich formatting

**❌ Use other skills instead:**
- Simple flowcharts → **mermaid**
- Data-driven charts → **vega**
- Visual org trees with icons → **infographic** (hierarchy-tree-*)
- Spatial mind maps → **canvas**

---

## Quick Start

1. **Choose graph type** — `digraph` (directed) or `graph` (undirected)
2. **Define nodes** — Create nodes with attributes (shape, color, label)
3. **Connect edges** — Link nodes with arrows or lines
4. **Set layout** — Configure rankdir, spacing, and clustering
5. **Output in markdown** — Wrap in code fence with `dot` identifier

**Default assumptions:**
- Top-to-bottom layout (`rankdir=TB`)
- Cluster names must start with `cluster_`
- Use semicolons to terminate statements

---

## Critical Syntax Rules

### Rule 1: Cluster Naming
```
❌ subgraph backend { }      → Won't render as box
✅ subgraph cluster_backend { }  → Must start with cluster_
```

### Rule 2: Node IDs with Spaces
```
❌ API Gateway [label="API"];    → Invalid ID
✅ "API Gateway" [label="API"];  → Quote the ID
✅ api_gateway [label="API Gateway"];  → Use underscore ID
```

### Rule 3: Edge Syntax Difference
```
digraph: A -> B;   → Directed arrow
graph:   A -- B;   → Undirected line
```

### Rule 4: Attribute Syntax
```
❌ node [shape=box color=red]    → Missing comma
✅ node [shape=box, color=red];  → Comma separated
```

### Rule 5: HTML Labels
```
✅ shape=plaintext for HTML labels
✅ Use < > not " " for HTML content
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Nodes overlapping | Increase `nodesep` and `ranksep` |
| Poor layout | Change `rankdir` or add `{rank=same}` |
| Edges crossing | Use `splines=ortho` or adjust node order |
| Cluster not showing | Name must start with `cluster_` |
| Label not displaying | Check quote escaping |

---

## Output Format

````markdown
```dot
digraph G {
    [diagram code]
}
```
````

---

## Related Files

> For advanced layout control and complex styling, refer to references below:

- [syntax.md](references/syntax.md) — Layout control (rankdir, splines, rank), HTML labels, edge styles, cluster subgraphs, and record-based nodes
