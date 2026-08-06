# Code Blocks 组件

这个无依赖组件为页面中的 `<pre>` 自动添加：

- Python 风格语法高亮
- 带状态反馈的一键复制按钮
- 动态插入代码块的自动增强
- 可覆盖的颜色主题变量

## 引入

```html
<link rel="stylesheet" href="assets/code-blocks.css" />
<script src="assets/code-blocks.js" defer></script>
```

组件默认增强页面中的所有 `<pre>`，不需要逐个初始化：

```html
<pre>print("Hello")</pre>
```

不需要语法高亮的文本块可以显式标记为纯文本：

```html
<pre data-language="plain">input -> retrieve -> answer</pre>
```

未填写 `data-language` 时默认使用 `python`。目前内置 Python 关键字、常用内置函数、字符串、数字、注释、函数、运算符和 PowerShell 变量的基础着色。

## JavaScript API

组件自动暴露只读的 `window.CodeBlocks`：

```js
CodeBlocks.init(container)       // 增强容器中新加入的代码块
CodeBlocks.enhance(preElement)   // 增强单个 pre
CodeBlocks.config               // 查看默认配置
```

一般不需要手动调用。组件使用 `MutationObserver` 自动处理后来插入页面的代码块，并通过 `data-code-enhanced` 防止重复初始化。

## 自定义主题

在组件样式之后覆盖 CSS 变量：

```css
:root {
  --code-block-background: #101827;
  --code-block-text: #e8eef8;
  --code-token-keyword: #c792ea;
  --code-token-string: #a5d6a7;
  --code-token-number: #f78c6c;
}
```

完整变量列表位于 `assets/code-blocks.css` 顶部。

## 维护约定

- 站点通用布局不要写进组件样式。
- 新语言高亮逻辑集中添加到 `assets/code-blocks.js`。
- 修改组件后同步更新资源 URL 的版本参数，避免 GitHub Pages 缓存旧文件。
- 发布前至少验证桌面、手机、复制状态、控制台以及所有章节代码块数量。
