# Moondown

> *We're Finally Landing.*  —— Home

流式 Markdown 渲染器，专为 LLM 聊天场景设计。

## 特性

- **增量解析** - 只解析新增内容，游标追踪已处理位置
- **稳定块/待定块分离** - 避免未完成块闪烁
- **物理缓冲** - 弹簧阻尼系统平滑输出速度
- **结构共享** - 复用未变化块引用，减少 Diff 开销
- **零布局偏移** - 预占位防止页面跳动
- **GFM 支持** - 表格、删除线、任务列表等扩展语法
- **平静设计排版** - 响应式流体字体、深色模式、中英文间距优化

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
