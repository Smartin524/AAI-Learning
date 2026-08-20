# AAI

一份面向持续学习与知识整理的课程型学习手册。内容按课程、Module 与章节组织，涵盖编程、人工智能、用户体验和数据可视化等主题；每页聚焦关键术语、核心知识、常见错误、示例与练习，便于系统学习和随时查阅。

## 课程

- **Python 通识**：基础语法、数据结构、文件与环境、NumPy、API、Embedding 和 RAG 相关章节。
- **CA6000 · Applied AI Programming**：Module 1 覆盖 Python 基础、数据结构与函数；Module 3 覆盖文件、异常、NumPy、Matplotlib、Pandas 与 Python 类。
- **CA6002 · AI UX & Data Visualisation Design Principles**：Module 1 覆盖数据属性、视觉编码与图表选择；Module 2 补充相关性分析、AI 模型可视化与时间序列分析；Module 3 聚焦 Gestalt 分组、色彩感知、人类视觉感知与有效图形的心理学原则。

首页是课程选择看板；进入课程后，可通过顶部的“课程”按钮在不同课程之间切换。课程内容页使用左侧目录和右侧正文的阅读布局。

顶部菜单还提供“日间 / 夜间 / 自适应”三种主题模式，默认跟随系统设置，用户选择会保存在本地并应用到所有页面。

## UI 与内容规则

项目的设计哲学、信息架构、颜色、排版、响应式、可访问性和新增课程约定统一记录在 [rules/ui-design.md](rules/ui-design.md)。新增课程或章节前应先遵循这份规则，避免产生新的导航和卡片体系。

## 在线阅读

https://smartin524.github.io/AAI-Learning/

## 本地阅读

首次开发时安装依赖并生成静态页面：

```bash
pnpm install
pnpm build
```

之后可以直接打开 `index.html`，或使用任意静态文件服务器预览。

提交前运行完整检查：

```bash
pnpm test
```

它会重新生成页面和带哈希的资源，检查本地链接、锚点与课程配置，并通过浏览器验证课程切换、主题切换和目录跳转。

## 项目结构

```text
site.config.json                    唯一课程、页面与目录配置
src/content/                        各章节与 Module 的正文源文件
src/templates/                      首页和课程页公共模板
src/styles/                         可维护的 CSS 源文件
src/client/                         Header、主题、首页和代码块交互
scripts/build.mjs                   页面生成与资源哈希
scripts/check.mjs                   配置、链接和锚点检查
tests/smoke.mjs                     浏览器基础交互回归
assets/build/                       自动生成并提交的哈希资源
index.html                          自动生成的课程选择首页
chapters/ 与 courses/               自动生成的课程页面
rules/ui-design.md                  UI 与内容设计规范
```

`index.html`、`chapters/`、`courses/` 和 `assets/build/` 是 GitHub Pages 直接使用的构建产物，不应手工修改。
