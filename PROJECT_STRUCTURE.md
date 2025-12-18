# 项目结构

```
thenchat/
├── src/
│   ├── app.css                       # Tailwind CSS 全局样式
│   ├── lib/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn-svelte UI 组件
│   │   │   │   ├── button/
│   │   │   │   ├── card/
│   │   │   │   └── input/
│   │   │   ├── ChatInterface.svelte  # 聊天主界面
│   │   │   ├── KeyInput.svelte       # API 密钥输入
│   │   │   ├── MessageInput.svelte   # 消息输入框
│   │   │   └── MessageList.svelte    # 消息列表
│   │   ├── indexeddb.js             # IndexedDB 工具函数
│   │   └── utils.ts                 # 工具函数 (cn)
│   └── routes/
│       ├── +page.svelte             # 主页
│       └── +page.js                 # 页面配置
│
├── static/                          # 静态资源
├── build/                           # 构建输出 (git ignored)
│
├── components.json                  # shadcn-svelte 配置
├── jsconfig.json                    # JavaScript 配置
├── tsconfig.json                    # TypeScript 配置
├── tailwind.config.js               # Tailwind CSS 配置
├── postcss.config.js                # PostCSS 配置
├── svelte.config.js                 # SvelteKit 配置
├── vite.config.js                   # Vite 配置
├── package.json                     # 项目依赖
│
├── README.md                        # 项目说明
├── INTEGRATION.md                   # shadcn-svelte 集成说明
└── DEPLOYMENT.md                    # 部署检查清单
```

## 核心文件说明

### 配置文件

- **svelte.config.js** - SvelteKit 配置，使用静态适配器
- **vite.config.js** - Vite 构建配置
- **tailwind.config.js** - Tailwind CSS v4 配置
- **postcss.config.js** - PostCSS 插件配置
- **components.json** - shadcn-svelte 组件配置

### 核心组件

1. **src/routes/+page.svelte**
   - 应用入口
   - 管理 API 密钥状态
   - 条件渲染 KeyInput 或 ChatInterface

2. **src/lib/components/KeyInput.svelte**
   - API 密钥输入界面
   - 密钥格式验证
   - 密钥有效性测试
   - 使用 shadcn-svelte Card, Button, Input

3. **src/lib/components/ChatInterface.svelte**
   - 聊天主界面
   - 管理消息历史
   - 处理 AI 流式响应
   - 错误处理
   - 使用 shadcn-svelte Button

4. **src/lib/components/MessageList.svelte**
   - 消息列表显示
   - 自动滚动到最新消息
   - 区分用户和 AI 消息

5. **src/lib/components/MessageInput.svelte**
   - 消息输入框
   - 支持 Enter 发送，Shift+Enter 换行
   - 使用 shadcn-svelte Button

### 工具模块

- **src/lib/indexeddb.js** - IndexedDB 操作封装
  - saveApiKey() - 保存密钥
  - loadApiKey() - 加载密钥
  - deleteApiKey() - 删除密钥

- **src/lib/utils.ts** - 工具函数
  - cn() - Tailwind 类名合并

## 技术特性

### 状态管理
- 使用 Svelte 5 Runes (`$state`, `$derived`, `$effect`)
- 响应式数据绑定

### AI 集成
- AI SDK Core - `streamText`
- OpenRouter Provider - `createOpenRouter`
- 流式响应实时显示

### 数据持久化
- IndexedDB 存储 API 密钥
- 浏览器本地存储，无服务器

### UI 框架
- Tailwind CSS v4
- shadcn-svelte 组件
- 响应式设计

### 部署
- 静态站点适配器
- 输出纯静态 HTML/JS/CSS
- 可部署到 Cloudflare Pages

## 数据流

```
用户 → KeyInput → IndexedDB (保存密钥)
                     ↓
                  +page.svelte (加载密钥)
                     ↓
                ChatInterface (使用密钥)
                     ↓
    MessageInput → AI SDK → OpenRouter API
                     ↓
                MessageList (显示响应)
```
