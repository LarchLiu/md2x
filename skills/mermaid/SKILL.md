---
name: mermaid
description: Create flowcharts, sequence diagrams, state machines, class diagrams, Gantt charts, mindmaps, and more. Best for process flows, API interactions, system architecture, and technical documentation. NOT for data-driven charts (use vega) or quick KPI visuals (use infographic).
---

# Mermaid Diagram Visualizer

## When to Use

**✅ Use mermaid when:**
- Process flow / workflow (flowchart with decision branches)
- Sequence / API interaction (sequence diagram with actors)
- Class / object structure (class diagram with relationships)
- State machine (state diagram with transitions)
- Database schema (ER diagram with cardinality)
- Project timeline with editable tasks (Gantt chart)
- Brainstorming / hierarchical ideas (mindmap)
- Historical events (timeline)
- User experience mapping (journey diagram)

**❌ Use other skills instead:**
- Data-driven charts (bar, line, scatter) → **vega**
- KPI cards, roadmaps, step processes → **infographic**
- Complex graphs with 100+ nodes → **graphviz**
- Free spatial positioning → **canvas**

---

## Quick Start

1. **Identify diagram type** — flowchart, sequence, state, class, ER, gantt, mindmap, etc.
2. **Define nodes** — Create entities with appropriate shapes
3. **Connect nodes** — Use proper arrow syntax
4. **Output in markdown** — Wrap in code fence with `mermaid` identifier

**Default assumptions:**
- Top-to-bottom layout (`TD`) unless specified
- Use `flowchart` over deprecated `graph` keyword
- Unicode (Chinese, etc.) supported natively

---

## Critical Syntax Rules

### Rule 1: List Syntax Conflicts
```
❌ [1. Item]     → "Unsupported markdown: list"
✅ [1.Item]      → Remove space after period
✅ [① Item]      → Use circled numbers ①②③④⑤⑥⑦⑧⑨⑩
✅ [(1) Item]    → Use parentheses
```

### Rule 2: Subgraph Naming
```
❌ subgraph AI Agent Core    → Space without quotes
✅ subgraph agent["AI Agent Core"]  → ID with display name
✅ subgraph agent            → Simple ID only
```

### Rule 3: Node References in Subgraphs
```
❌ Title --> AI Agent Core   → Reference display name
✅ Title --> agent           → Reference subgraph ID
```

### Rule 4: Special Characters in Node Text
```
✅ ["Text with spaces"]       → Quotes for spaces
✅ Use 『』 instead of ""     → Avoid quotation marks
✅ Use 「」 instead of ()     → Avoid parentheses
```

### Rule 5: Use flowchart over graph
```
❌ graph TD      → Outdated
✅ flowchart TD  → Supports subgraph directions, more features
```

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| Diagram won't render | Check unmatched brackets, quotes |
| List syntax error | `[1.Item]` not `[1. Item]` |
| Subgraph reference fails | Use ID not display name |
| Too crowded | Split into multiple diagrams |
| Crossing connections | Use different layout direction or invisible edges `~~~` |

---

## Output Format

````markdown
```mermaid
[diagram code]
```
````

---

## Related Files

> For diagram-specific syntax and advanced features, refer to references below:

- [syntax.md](references/syntax.md) — Detailed syntax for all 14+ diagram types: flowchart shapes, sequence actors, class relationships, state transitions, ER cardinality, Gantt tasks, and more
