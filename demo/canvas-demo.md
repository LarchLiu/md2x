# JSON Canvas 演示

[返回主测试文档](./test.md)

本文档演示 JSON Canvas 格式的渲染效果。JSON Canvas 是由 Obsidian 创建的开放格式，用于存储无限画布数据。

---

## 1. 基础示例 - 两个节点连接

```canvas
{
  "nodes": [
    {
      "id": "node1",
      "type": "text",
      "text": "Hello",
      "x": 0,
      "y": 0,
      "width": 150,
      "height": 60
    },
    {
      "id": "node2",
      "type": "text",
      "text": "World",
      "x": 250,
      "y": 0,
      "width": 150,
      "height": 60
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "fromNode": "node1",
      "fromSide": "right",
      "toNode": "node2",
      "toSide": "left"
    }
  ]
}
```

---

## 2. 彩色节点

JSON Canvas 支持 6 种预设颜色：

```canvas
{
  "nodes": [
    {"id": "red", "type": "text", "text": "Red (1)", "x": 0, "y": 0, "width": 120, "height": 50, "color": "1"},
    {"id": "orange", "type": "text", "text": "Orange (2)", "x": 140, "y": 0, "width": 120, "height": 50, "color": "2"},
    {"id": "yellow", "type": "text", "text": "Yellow (3)", "x": 280, "y": 0, "width": 120, "height": 50, "color": "3"},
    {"id": "green", "type": "text", "text": "Green (4)", "x": 0, "y": 70, "width": 120, "height": 50, "color": "4"},
    {"id": "cyan", "type": "text", "text": "Cyan (5)", "x": 140, "y": 70, "width": 120, "height": 50, "color": "5"},
    {"id": "purple", "type": "text", "text": "Purple (6)", "x": 280, "y": 70, "width": 120, "height": 50, "color": "6"}
  ],
  "edges": []
}
```

---

## 3. 分组 (Group)

节点可以放在分组中：

```canvas
{
  "nodes": [
    {
      "id": "group1",
      "type": "group",
      "label": "My Group",
      "x": 0,
      "y": 0,
      "width": 350,
      "height": 180,
      "color": "4"
    },
    {
      "id": "item1",
      "type": "text",
      "text": "Item 1",
      "x": 20,
      "y": 30,
      "width": 140,
      "height": 50
    },
    {
      "id": "item2",
      "type": "text",
      "text": "Item 2",
      "x": 180,
      "y": 30,
      "width": 140,
      "height": 50
    },
    {
      "id": "item3",
      "type": "text",
      "text": "Item 3",
      "x": 100,
      "y": 100,
      "width": 140,
      "height": 50,
      "color": "5"
    }
  ],
  "edges": [
    {"id": "e1", "fromNode": "item1", "fromSide": "bottom", "toNode": "item3", "toSide": "top"},
    {"id": "e2", "fromNode": "item2", "fromSide": "bottom", "toNode": "item3", "toSide": "top"}
  ]
}
```

---

## 4. 流程图示例

```canvas
{
  "nodes": [
    {"id": "start", "type": "text", "text": "开始", "x": 150, "y": 0, "width": 100, "height": 50, "color": "4"},
    {"id": "process1", "type": "text", "text": "处理数据", "x": 150, "y": 80, "width": 100, "height": 50},
    {"id": "decision", "type": "text", "text": "是否有效?", "x": 150, "y": 160, "width": 100, "height": 50, "color": "3"},
    {"id": "yes", "type": "text", "text": "保存结果", "x": 50, "y": 240, "width": 100, "height": 50, "color": "4"},
    {"id": "no", "type": "text", "text": "报告错误", "x": 250, "y": 240, "width": 100, "height": 50, "color": "1"},
    {"id": "end", "type": "text", "text": "结束", "x": 150, "y": 320, "width": 100, "height": 50, "color": "6"}
  ],
  "edges": [
    {"id": "e1", "fromNode": "start", "fromSide": "bottom", "toNode": "process1", "toSide": "top"},
    {"id": "e2", "fromNode": "process1", "fromSide": "bottom", "toNode": "decision", "toSide": "top"},
    {"id": "e3", "fromNode": "decision", "fromSide": "left", "toNode": "yes", "toSide": "top", "label": "是"},
    {"id": "e4", "fromNode": "decision", "fromSide": "right", "toNode": "no", "toSide": "top", "label": "否"},
    {"id": "e5", "fromNode": "yes", "fromSide": "bottom", "toNode": "end", "toSide": "left"},
    {"id": "e6", "fromNode": "no", "fromSide": "bottom", "toNode": "end", "toSide": "right"}
  ]
}
```

---

## 5. 不同节点类型

JSON Canvas 支持四种节点类型：text、file、link、group

```canvas
{
	"nodes":[
		{"id":"group-node","type":"group","x":220,"y":80,"width":300,"height":220,"color":"6","label":"分组容器"},
		{"id":"text-node","type":"text","text":"这是文本节点\n支持多行内容","x":-100,"y":-100,"width":180,"height":80},
		{"id":"file-node","type":"file","file":"document.pdf","x":200,"y":-130,"width":180,"height":60,"color":"2"},
		{"id":"link-node","type":"link","url":"https://jsoncanvas.org","x":-60,"y":160,"width":200,"height":60,"color":"5"}
	],
	"edges":[
		{"id":"e1","fromNode":"text-node","fromSide":"right","toNode":"file-node","toSide":"left"},
		{"id":"e2","fromNode":"text-node","fromSide":"bottom","toNode":"link-node","toSide":"top"}
	]
}
```

---

## 6. 长文本换行

节点内的长文本会自动换行：

```canvas
{
  "nodes": [
    {"id": "short", "type": "text", "text": "短文本", "x": 0, "y": 0, "width": 120, "height": 60},
    {"id": "long", "type": "text", "text": "这是一段比较长的文本内容，会根据节点宽度自动换行显示，确保内容不会溢出节点边界。", "x": 150, "y": 0, "width": 200, "height": 100},
    {"id": "multiline", "type": "text", "text": "第一行内容\n第二行内容\n第三行内容", "x": 380, "y": 0, "width": 150, "height": 100, "color": "5"},
    {"id": "english", "type": "text", "text": "This is a longer English text that demonstrates word wrapping in JSON Canvas nodes.", "x": 75, "y": 130, "width": 180, "height": 100, "color": "2"}
  ],
  "edges": [
    {"id": "e1", "fromNode": "short", "fromSide": "right", "toNode": "long", "toSide": "left"},
    {"id": "e2", "fromNode": "long", "fromSide": "right", "toNode": "multiline", "toSide": "left"}
  ]
}
```

---

## 7. Markdown 语法支持

节点文本支持基础的 Markdown 内联语法：

```canvas
{
  "nodes": [
    {"id": "h1", "type": "text", "text": "# 一级标题", "x": 0, "y": 0, "width": 180, "height": 60},
    {"id": "h2", "type": "text", "text": "## 二级标题", "x": 200, "y": 0, "width": 180, "height": 60},
    {"id": "h3", "type": "text", "text": "### 三级标题", "x": 400, "y": 0, "width": 180, "height": 60},
    {"id": "bold", "type": "text", "text": "**粗体文本** 示例", "x": 0, "y": 80, "width": 180, "height": 60, "color": "1"},
    {"id": "italic", "type": "text", "text": "*斜体文本* 示例", "x": 200, "y": 80, "width": 180, "height": 60, "color": "2"},
    {"id": "code", "type": "text", "text": "内联 `代码` 示例", "x": 400, "y": 80, "width": 180, "height": 60, "color": "3"},
    {"id": "strike", "type": "text", "text": "~~删除线~~ 示例", "x": 0, "y": 160, "width": 180, "height": 60, "color": "4"},
    {"id": "link", "type": "text", "text": "[链接示例](https://example.com)", "x": 200, "y": 160, "width": 180, "height": 60, "color": "5"},
    {"id": "mixed", "type": "text", "text": "## 混合格式\n**粗体**和`代码`", "x": 400, "y": 160, "width": 180, "height": 100, "color": "6"}
  ],
  "edges": [
    {"id": "e1", "fromNode": "h1", "fromSide": "bottom", "toNode": "bold", "toSide": "top", "toEnd": "none"},
    {"id": "e2", "fromNode": "h2", "fromSide": "bottom", "toNode": "italic", "toSide": "top", "toEnd": "none"},
    {"id": "e3", "fromNode": "h3", "fromSide": "bottom", "toNode": "code", "toSide": "top", "toEnd": "none"}
  ]
}
```

### 支持的语法

| 语法 | 效果 |
|------|------|
| `# text` | 一级标题 |
| `## text` ~ `###### text` | 二级~六级标题 |
| `**text**` 或 `__text__` | **粗体** |
| `*text*` 或 `_text_` | *斜体* |
| `` `code` `` | `代码` |
| `~~text~~` | ~~删除线~~ |
| `[text](url)` | [链接](url) |

---

## 8. 双向箭头和无箭头边

```canvas
{
  "nodes": [
    {"id": "a", "type": "text", "text": "A", "x": 0, "y": 0, "width": 80, "height": 50},
    {"id": "b", "type": "text", "text": "B", "x": 150, "y": 0, "width": 80, "height": 50},
    {"id": "c", "type": "text", "text": "C", "x": 300, "y": 0, "width": 80, "height": 50},
    {"id": "d", "type": "text", "text": "D", "x": 75, "y": 100, "width": 80, "height": 50},
    {"id": "e", "type": "text", "text": "E", "x": 225, "y": 100, "width": 80, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a", "fromSide": "right", "toNode": "b", "toSide": "left", "toEnd": "arrow", "label": "单向"},
    {"id": "e2", "fromNode": "b", "fromSide": "right", "toNode": "c", "toSide": "left", "fromEnd": "arrow", "toEnd": "arrow", "label": "双向"},
    {"id": "e3", "fromNode": "d", "fromSide": "right", "toNode": "e", "toSide": "left", "fromEnd": "none", "toEnd": "none", "label": "无箭头"}
  ]
}
```

---

## 9. 软件开发流程

```canvas
{
  "nodes": [
    {"id": "group-plan", "type": "group", "label": "📋 计划阶段", "x": -20, "y": -20, "width": 520, "height": 180, "color": "5"},
    {"id": "kickoff", "type": "text", "text": "项目启动\n确定目标", "x": 0, "y": 30, "width": 100, "height": 60, "color": "5"},
    {"id": "requirements", "type": "text", "text": "需求分析\n用户访谈", "x": 130, "y": 30, "width": 100, "height": 60, "color": "5"},
    {"id": "design", "type": "text", "text": "架构设计\n技术选型", "x": 260, "y": 30, "width": 100, "height": 60, "color": "5"},
    {"id": "plan", "type": "text", "text": "项目计划\n里程碑", "x": 390, "y": 30, "width": 100, "height": 60, "color": "5"},
    {"id": "doc-req", "type": "text", "text": "需求文档", "x": 65, "y": 110, "width": 80, "height": 40},
    {"id": "doc-design", "type": "text", "text": "设计文档", "x": 325, "y": 110, "width": 80, "height": 40},
    
    {"id": "group-dev", "type": "group", "label": "💻 开发阶段", "x": -20, "y": 190, "width": 520, "height": 180, "color": "4"},
    {"id": "env-setup", "type": "text", "text": "环境搭建\nCI/CD配置", "x": 0, "y": 240, "width": 100, "height": 60, "color": "4"},
    {"id": "coding", "type": "text", "text": "功能开发\n编码实现", "x": 130, "y": 240, "width": 100, "height": 60, "color": "4"},
    {"id": "review", "type": "text", "text": "代码审查\nPR Review", "x": 260, "y": 240, "width": 100, "height": 60, "color": "4"},
    {"id": "unittest", "type": "text", "text": "单元测试\n覆盖率检查", "x": 390, "y": 240, "width": 100, "height": 60, "color": "4"},
    {"id": "bugfix", "type": "text", "text": "Bug修复", "x": 195, "y": 320, "width": 80, "height": 40, "color": "1"},
    
    {"id": "group-test", "type": "group", "label": "🧪 测试阶段", "x": -20, "y": 400, "width": 520, "height": 180, "color": "3"},
    {"id": "integration", "type": "text", "text": "集成测试\n接口测试", "x": 0, "y": 450, "width": 100, "height": 60, "color": "3"},
    {"id": "system", "type": "text", "text": "系统测试\n性能测试", "x": 130, "y": 450, "width": 100, "height": 60, "color": "3"},
    {"id": "security", "type": "text", "text": "安全测试\n渗透测试", "x": 260, "y": 450, "width": 100, "height": 60, "color": "3"},
    {"id": "uat", "type": "text", "text": "用户验收\n反馈收集", "x": 390, "y": 450, "width": 100, "height": 60, "color": "3"},
    {"id": "testcase", "type": "text", "text": "测试报告", "x": 195, "y": 530, "width": 80, "height": 40},
    
    {"id": "group-deploy", "type": "group", "label": "🚀 发布阶段", "x": -20, "y": 610, "width": 520, "height": 180, "color": "6"},
    {"id": "staging", "type": "text", "text": "预发布环境\n最终验证", "x": 0, "y": 660, "width": 100, "height": 60, "color": "6"},
    {"id": "deploy", "type": "text", "text": "正式发布\n灰度发布", "x": 130, "y": 660, "width": 100, "height": 60, "color": "6"},
    {"id": "monitor", "type": "text", "text": "监控告警\n日志分析", "x": 260, "y": 660, "width": 100, "height": 60, "color": "6"},
    {"id": "operate", "type": "text", "text": "运维支持\n故障处理", "x": 390, "y": 660, "width": 100, "height": 60, "color": "6"},
    {"id": "rollback", "type": "text", "text": "回滚预案", "x": 65, "y": 740, "width": 80, "height": 40, "color": "1"},
    {"id": "changelog", "type": "text", "text": "发布文档", "x": 325, "y": 740, "width": 80, "height": 40}
  ],
  "edges": [
    {"id": "e1", "fromNode": "kickoff", "fromSide": "right", "toNode": "requirements", "toSide": "left"},
    {"id": "e2", "fromNode": "requirements", "fromSide": "right", "toNode": "design", "toSide": "left"},
    {"id": "e3", "fromNode": "design", "fromSide": "right", "toNode": "plan", "toSide": "left"},
    {"id": "e4", "fromNode": "requirements", "fromSide": "bottom", "toNode": "doc-req", "toSide": "top", "toEnd": "none"},
    {"id": "e5", "fromNode": "design", "fromSide": "bottom", "toNode": "doc-design", "toSide": "top", "toEnd": "none"},
    
    {"id": "e6", "fromNode": "plan", "fromSide": "bottom", "toNode": "env-setup", "toSide": "top"},
    {"id": "e7", "fromNode": "env-setup", "fromSide": "right", "toNode": "coding", "toSide": "left"},
    {"id": "e8", "fromNode": "coding", "fromSide": "right", "toNode": "review", "toSide": "left"},
    {"id": "e9", "fromNode": "review", "fromSide": "right", "toNode": "unittest", "toSide": "left"},
    {"id": "e10", "fromNode": "review", "fromSide": "bottom", "toNode": "bugfix", "toSide": "top"},
    {"id": "e11", "fromNode": "bugfix", "fromSide": "left", "toNode": "coding", "toSide": "bottom", "label": "修复"},
    
    {"id": "e12", "fromNode": "unittest", "fromSide": "bottom", "toNode": "integration", "toSide": "top"},
    {"id": "e13", "fromNode": "integration", "fromSide": "right", "toNode": "system", "toSide": "left"},
    {"id": "e14", "fromNode": "system", "fromSide": "right", "toNode": "security", "toSide": "left"},
    {"id": "e15", "fromNode": "security", "fromSide": "right", "toNode": "uat", "toSide": "left"},
    {"id": "e16", "fromNode": "system", "fromSide": "bottom", "toNode": "testcase", "toSide": "top", "toEnd": "none"},
    
    {"id": "e17", "fromNode": "uat", "fromSide": "bottom", "toNode": "staging", "toSide": "top"},
    {"id": "e18", "fromNode": "staging", "fromSide": "right", "toNode": "deploy", "toSide": "left"},
    {"id": "e19", "fromNode": "deploy", "fromSide": "right", "toNode": "monitor", "toSide": "left"},
    {"id": "e20", "fromNode": "monitor", "fromSide": "right", "toNode": "operate", "toSide": "left"},
    {"id": "e21", "fromNode": "staging", "fromSide": "bottom", "toNode": "rollback", "toSide": "top", "toEnd": "none"},
    {"id": "e22", "fromNode": "monitor", "fromSide": "bottom", "toNode": "changelog", "toSide": "top", "toEnd": "none"},
    
    {"id": "e23", "fromNode": "operate", "fromSide": "right", "toNode": "kickoff", "toSide": "right", "label": "下一迭代", "color": "2"},
    {"id": "e24", "fromNode": "uat", "fromSide": "left", "toNode": "coding", "toSide": "left", "label": "需求变更", "color": "1"}
  ]
}
```

---

## 10. 节点间距测试

测试节点间距较近时的连线效果（所有节点使用透明颜色以便观察穿透）：

### 精细间距测试（15px - 30px，每2px一档）

```canvas
{
  "nodes": [
    {"id": "a1", "type": "text", "text": "15", "x": 0, "y": 0, "width": 50, "height": 40, "color": "1"},
    {"id": "b1", "type": "text", "text": "B", "x": 0, "y": 55, "width": 50, "height": 40, "color": "1"},
    
    {"id": "a2", "type": "text", "text": "17", "x": 60, "y": 0, "width": 50, "height": 40, "color": "2"},
    {"id": "b2", "type": "text", "text": "B", "x": 60, "y": 57, "width": 50, "height": 40, "color": "2"},
    
    {"id": "a3", "type": "text", "text": "19", "x": 120, "y": 0, "width": 50, "height": 40, "color": "3"},
    {"id": "b3", "type": "text", "text": "B", "x": 120, "y": 59, "width": 50, "height": 40, "color": "3"},
    
    {"id": "a4", "type": "text", "text": "21", "x": 180, "y": 0, "width": 50, "height": 40, "color": "4"},
    {"id": "b4", "type": "text", "text": "B", "x": 180, "y": 61, "width": 50, "height": 40, "color": "4"},
    
    {"id": "a5", "type": "text", "text": "23", "x": 240, "y": 0, "width": 50, "height": 40, "color": "5"},
    {"id": "b5", "type": "text", "text": "B", "x": 240, "y": 63, "width": 50, "height": 40, "color": "5"},
    
    {"id": "a6", "type": "text", "text": "25", "x": 300, "y": 0, "width": 50, "height": 40, "color": "6"},
    {"id": "b6", "type": "text", "text": "B", "x": 300, "y": 65, "width": 50, "height": 40, "color": "6"},
    
    {"id": "a7", "type": "text", "text": "27", "x": 360, "y": 0, "width": 50, "height": 40, "color": "1"},
    {"id": "b7", "type": "text", "text": "B", "x": 360, "y": 67, "width": 50, "height": 40, "color": "1"},
    
    {"id": "a8", "type": "text", "text": "30", "x": 420, "y": 0, "width": 50, "height": 40, "color": "2"},
    {"id": "b8", "type": "text", "text": "B", "x": 420, "y": 70, "width": 50, "height": 40, "color": "2"}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a1", "fromSide": "bottom", "toNode": "b1", "toSide": "top", "toEnd": "none"},
    {"id": "e2", "fromNode": "a2", "fromSide": "bottom", "toNode": "b2", "toSide": "top", "toEnd": "none"},
    {"id": "e3", "fromNode": "a3", "fromSide": "bottom", "toNode": "b3", "toSide": "top", "toEnd": "none"},
    {"id": "e4", "fromNode": "a4", "fromSide": "bottom", "toNode": "b4", "toSide": "top", "toEnd": "none"},
    {"id": "e5", "fromNode": "a5", "fromSide": "bottom", "toNode": "b5", "toSide": "top", "toEnd": "none"},
    {"id": "e6", "fromNode": "a6", "fromSide": "bottom", "toNode": "b6", "toSide": "top", "toEnd": "none"},
    {"id": "e7", "fromNode": "a7", "fromSide": "bottom", "toNode": "b7", "toSide": "top", "toEnd": "none"},
    {"id": "e8", "fromNode": "a8", "fromSide": "bottom", "toNode": "b8", "toSide": "top", "toEnd": "none"}
  ]
}
```

### 不同间距测试（无箭头，高度40，10px - 100px）

```canvas
{
  "nodes": [
    {"id": "a1", "type": "text", "text": "10px", "x": 0, "y": 0, "width": 60, "height": 40},
    {"id": "b1", "type": "text", "text": "B", "x": 0, "y": 50, "width": 60, "height": 40},
    
    {"id": "a2", "type": "text", "text": "20px", "x": 80, "y": 0, "width": 60, "height": 40},
    {"id": "b2", "type": "text", "text": "B", "x": 80, "y": 60, "width": 60, "height": 40},
    
    {"id": "a3", "type": "text", "text": "30px", "x": 160, "y": 0, "width": 60, "height": 40},
    {"id": "b3", "type": "text", "text": "B", "x": 160, "y": 70, "width": 60, "height": 40},
    
    {"id": "a4", "type": "text", "text": "40px", "x": 240, "y": 0, "width": 60, "height": 40},
    {"id": "b4", "type": "text", "text": "B", "x": 240, "y": 80, "width": 60, "height": 40},
    
    {"id": "a5", "type": "text", "text": "50px", "x": 320, "y": 0, "width": 60, "height": 40},
    {"id": "b5", "type": "text", "text": "B", "x": 320, "y": 90, "width": 60, "height": 40},
    
    {"id": "a6", "type": "text", "text": "60px", "x": 400, "y": 0, "width": 60, "height": 40},
    {"id": "b6", "type": "text", "text": "B", "x": 400, "y": 100, "width": 60, "height": 40},
    
    {"id": "a7", "type": "text", "text": "80px", "x": 480, "y": 0, "width": 60, "height": 40},
    {"id": "b7", "type": "text", "text": "B", "x": 480, "y": 120, "width": 60, "height": 40},
    
    {"id": "a8", "type": "text", "text": "100px", "x": 560, "y": 0, "width": 60, "height": 40},
    {"id": "b8", "type": "text", "text": "B", "x": 560, "y": 140, "width": 60, "height": 40}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a1", "fromSide": "bottom", "toNode": "b1", "toSide": "top", "toEnd": "none"},
    {"id": "e2", "fromNode": "a2", "fromSide": "bottom", "toNode": "b2", "toSide": "top", "toEnd": "none"},
    {"id": "e3", "fromNode": "a3", "fromSide": "bottom", "toNode": "b3", "toSide": "top", "toEnd": "none"},
    {"id": "e4", "fromNode": "a4", "fromSide": "bottom", "toNode": "b4", "toSide": "top", "toEnd": "none"},
    {"id": "e5", "fromNode": "a5", "fromSide": "bottom", "toNode": "b5", "toSide": "top", "toEnd": "none"},
    {"id": "e6", "fromNode": "a6", "fromSide": "bottom", "toNode": "b6", "toSide": "top", "toEnd": "none"},
    {"id": "e7", "fromNode": "a7", "fromSide": "bottom", "toNode": "b7", "toSide": "top", "toEnd": "none"},
    {"id": "e8", "fromNode": "a8", "fromSide": "bottom", "toNode": "b8", "toSide": "top", "toEnd": "none"}
  ]
}
```

### 竖直方向 - 密集节点

```canvas
{
  "nodes": [
    {"id": "a", "type": "text", "text": "A", "x": 0, "y": 0, "width": 100, "height": 50},
    {"id": "b", "type": "text", "text": "B", "x": 0, "y": 60, "width": 100, "height": 50},
    {"id": "c", "type": "text", "text": "C", "x": 0, "y": 120, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a", "fromSide": "bottom", "toNode": "b", "toSide": "top"},
    {"id": "e2", "fromNode": "b", "fromSide": "bottom", "toNode": "c", "toSide": "top"}
  ]
}
```

### 水平方向 - 密集节点

```canvas
{
  "nodes": [
    {"id": "a", "type": "text", "text": "A", "x": 0, "y": 0, "width": 80, "height": 50},
    {"id": "b", "type": "text", "text": "B", "x": 90, "y": 0, "width": 80, "height": 50},
    {"id": "c", "type": "text", "text": "C", "x": 180, "y": 0, "width": 80, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a", "fromSide": "right", "toNode": "b", "toSide": "left"},
    {"id": "e2", "fromNode": "b", "fromSide": "right", "toNode": "c", "toSide": "left"}
  ]
}
```

### 近距离双向箭头

```canvas
{
  "nodes": [
    {"id": "a", "type": "text", "text": "A", "x": 0, "y": 0, "width": 100, "height": 50},
    {"id": "b", "type": "text", "text": "B", "x": 0, "y": 60, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a", "fromSide": "bottom", "toNode": "b", "toSide": "top", "fromEnd": "arrow", "toEnd": "arrow", "label": "双向10px"}
  ]
}
```

### 极近距离双向箭头（4px间隔 - 箭头会明显变小）

```canvas
{
  "nodes": [
    {"id": "a", "type": "text", "text": "A", "x": 0, "y": 0, "width": 100, "height": 50},
    {"id": "b", "type": "text", "text": "B", "x": 0, "y": 54, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a", "fromSide": "bottom", "toNode": "b", "toSide": "top", "fromEnd": "arrow", "toEnd": "arrow", "label": "双向4px"}
  ]
}
```

### 近距离无箭头

```canvas
{
  "nodes": [
    {"id": "a", "type": "text", "text": "A", "x": 0, "y": 0, "width": 100, "height": 50},
    {"id": "b", "type": "text", "text": "B", "x": 0, "y": 60, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a", "fromSide": "bottom", "toNode": "b", "toSide": "top", "fromEnd": "none", "toEnd": "none", "label": "无箭头"}
  ]
}
```

### 极近距离（5px间隔）

```canvas
{
  "nodes": [
    {"id": "a", "type": "text", "text": "A", "x": 0, "y": 0, "width": 100, "height": 50},
    {"id": "b", "type": "text", "text": "B", "x": 0, "y": 55, "width": 100, "height": 50}
  ],
  "edges": [
    {"id": "e1", "fromNode": "a", "fromSide": "bottom", "toNode": "b", "toSide": "top", "label": "5px"}
  ]
}
```

---

## 参考链接

- [JSON Canvas 官方规范](https://jsoncanvas.org/spec/1.0/)
- [JSON Canvas GitHub](https://github.com/obsidianmd/jsoncanvas)
