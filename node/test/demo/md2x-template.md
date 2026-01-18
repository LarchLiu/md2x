---
format: png
image:
  selector:
    - '.md2x-diagram[data-md2x-diagram-kind="md2x-vue"]'
    - '.md2x-diagram[data-md2x-diagram-kind="md2x-html"]'
  selectorMode: stitch
---

```md2x
{
  type: 'vue',
  template: 'example.vue',
  data: [{
    title: 'hello word',
    message: 'This is a message from md2x!'
    }, {
    title: 'vue3-sfc-loader',
    message: 'This is a message from vue3-sfc-loader!'
  }]
}
```

---

```md2x
{
  type: 'html',
  template: 'example.html',
  allowScripts: true,
  data: [{
    title: 'hello word',
    message: 'This is a message from md2x!'
    }, {
    title: 'welcome to the html template',
    message: 'This is a message from html template!'
  }]
}
```
