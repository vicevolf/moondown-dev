# Moondown

> *We're Finally Landing.* — Home

流式 Markdown **增量**渲染器，为 AI LLM 输出场景设计。

## 特性
人本设计：
- **增量解析** - 只处理新增内容，不重复解析已稳定部分
- **增量渲染** - 精准更新变化区域，已渲染内容保持不动
- **增量扩展** - 按需加载扩展，代码高亮、数学公式、流程图等
- **减少闪烁** - 稳定块与待定块分离，避免未完成内容跳变
- **平滑输出** - 物理缓冲系统，让抖动的流式输出稳定流畅
- **GFM 支持** - 表格、删除线、任务列表、自动链接
- **平静排版** - 响应式字体、深色模式、中英文间距优化

## 使用

```svelte
<script>
  import { MoonGravity, Moondown } from '$lib/moondown';
</script>

<!-- 带物理缓冲，推荐用于流式场景 -->
<MoonGravity content={streamingText} isStreaming={true} />

<!-- 直接渲染，无缓冲 -->
<Moondown content={markdownText} isStreaming={false} />
```

## 结构

```
src/lib/moondown/
├── Moondown.svelte      # 主组件
├── MoonGravity.svelte   # 物理缓冲层
├── MoonRider.svelte     # 递归 AST 渲染器
├── engine.ts            # 增量解析引擎
├── moonGravity.ts       # 物理缓冲逻辑
├── moondown.css         # 排版样式
└── extensions/          # 扩展渲染器
```

## 开发

```bash
npm install
npm run dev
```

## 技术栈

- Svelte 5 (Runes)
- mdast-util-from-markdown
- micromark-extension-gfm

## 许可证

MPL-2.0
