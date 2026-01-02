# Moondown

> *We're Finally Landing.*  —— Home

流式 Markdown 渲染器，专为 LLM 聊天场景设计。

## 特性

人本设计：

- **增量解析** - 只处理新增内容，不重复解析已稳定部分
- **增量渲染** - 精准更新变化区域，已渲染内容保持不动
- **减少闪烁** - 稳定块与待定块分离，避免未完成内容跳变
- **平滑输出** - 物理缓冲系统，让抖动的串流流稳定流畅
- **GFM 扩展** - 表格、删除线、任务列表、代码高亮
- **平静排版** - 响应式字体、深色模式、中英文间距优化

## 使用

```svelte
<script>
  import { MoonGravity } from '$lib/moondown';
</script>

<!-- 带物理缓冲（推荐用于流式场景） -->
<MoonGravity content={streamingText} isStreaming={true} />

<!-- 直接渲染（无缓冲） -->
<script>
  import { Moondown } from '$lib/moondown';
</script>
<Moondown content={markdownText} isStreaming={false} />
```

## 文件结构

```
src/lib/moondown/
├── Moondown.svelte      # 主组件
├── MoonGravity.svelte   # 物理缓冲层
├── MoonRider.svelte     # 递归 AST 渲染器
├── engine.ts            # 增量解析引擎
├── moongravity.ts       # 物理缓冲逻辑
├── moondown.css         # 排版样式
└── lunar-eclipse.css    # 增强效果
```

## 本地开发

```bash
npm install
npm run dev # 启动 Thenchat 演示应用
```

## 技术栈

- Svelte 5 (Runes)
- mdast-util-from-markdown
- micromark-extension-gfm

## 许可证

MPL-2.0
