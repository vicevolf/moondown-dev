# AI 聊天演示应用设计文档

## 项目概述

基于 SvelteKit 框架开发的纯前端 AI 聊天演示应用,部署于 Cloudflare Pages 静态托管。采用 BYOK 模式,用户在前端填入 OpenRouter API 密钥,利用 OpenRouter 支持浏览器直接调用的特性,在前端使用 AI SDK Core 直接调用 OpenRouter API,无需后端服务器或边缘函数,实现真正的无服务器架构。

## 技术栈

- SvelteKit: Web 应用框架,仅使用前端功能(路由、页面管理)
- AI SDK Core: 核心 AI 功能库,在浏览器端直接调用 LLM
- @openrouter/ai-sdk-provider: OpenRouter 的 AI SDK 提供商
- Tailwind CSS: 样式开发框架
- shadcn-svelte: 可复用 UI 组件库
- IndexedDB: 浏览器端持久化存储,保存用户密钥
- OpenRouter API: AI 模型网关服务,支持浏览器直接调用(无 CORS 限制)

## 核心功能

### 用户密钥管理

用户首次访问应用时需要填入 OpenRouter API 密钥

- 密钥输入界面
  - 提供文本输入框供用户填写 API 密钥
  - 显示密钥格式说明 (sk-or-v1-xxx)
  - 提供 OpenRouter 官网链接,引导用户获取密钥
  - 输入框支持显示/隐藏密钥内容切换
  - 提供验证按钮,测试密钥有效性
  
- 密钥存储策略
  - 使用 IndexedDB 持久化存储密钥在浏览器本地
  - 密钥完全存储在用户本地浏览器,永不离开客户端
  - 每次 AI 请求时,从 IndexedDB 读取密钥直接用于浏览器端的 AI SDK 调用
  - 提供删除密钥功能,清空本地存储
  - 应用启动时自动检测 IndexedDB 中是否存在密钥
  - 若存在密钥则跳过输入步骤直接进入聊天界面

- 密钥安全说明
  - 界面明确告知用户密钥仅存储在本地浏览器
  - 说明密钥在浏览器端通过 HTTPS 直接发送给 OpenRouter API
  - 强调密钥不经过任何中间服务器
  - 提示用户妥善保管密钥

### 模型选择

应用默认使用固定模型,简化用户操作

- 默认模型配置
  - 预设使用 `xiaomi/mimo-v2-flash:free` 免费模型
  - 模型配置在前端代码中设置
  - 模型信息展示在界面顶部区域
  - 用户可查看当前使用的模型名称

### 聊天对话功能

提供基础的文本对话能力

- 消息输入区域
  - 多行文本输入框
  - 发送按钮
  - 支持回车键发送 (Shift+Enter 换行)
  - 输入框在发送中状态下禁用
  
- 消息展示区域
  - 消息列表滚动容器
  - 区分用户消息和 AI 消息的视觉样式
  - 用户消息显示在右侧,AI 消息显示在左侧
  - 新消息自动滚动到底部
  - 流式响应实时显示 AI 回复内容
  
- 对话状态管理
  - 显示 AI 思考中状态 (提交中/流式传输中)
  - 错误状态提示
  - 就绪状态允许发送新消息

## 页面布局结构

应用采用单页面布局,包含以下主要区域:

- 顶部区域
  - 应用标题
  - 当前使用模型显示
  - 密钥管理按钮 (修改/删除密钥)
  
- 中部区域
  - 聊天消息展示区域 (占据主要空间)
  - 消息列表
    - 用户消息气泡 (右对齐)
    - AI 消息气泡 (左对齐)
  
- 底部区域
  - 消息输入框
  - 发送按钮
  - 状态指示器

- 初始化界面
  - 密钥输入区域 (居中卡片)
  - 欢迎说明
  - 密钥输入表单

## 数据流设计

### 密钥初始化流程

应用启动时执行以下检查和初始化步骤:

1. 检查 IndexedDB 中是否存储密钥
2. 若存在密钥,加载并进入聊天界面
3. 若不存在密钥,显示密钥输入界面
4. 用户输入密钥后,可选择验证密钥有效性
5. 验证通过后,将密钥存储至 IndexedDB
6. 跳转至聊天界面

### 消息发送流程

用户发送消息后的处理流程:

1. 用户在输入框输入消息并点击发送
2. 将用户消息添加到消息列表
3. 禁用输入框,显示发送中状态
4. 从 IndexedDB 获取用户密钥
5. 在浏览器端使用密钥创建 OpenRouter provider 实例
6. 调用 AI SDK Core 的 streamText 函数生成流式响应
7. 使用 textStream 或 fullStream 迭代器实时接收 AI 响应
8. 实时更新消息列表显示 AI 回复内容
9. 完成后启用输入框,恢复就绪状态

### 错误处理流程

各类错误场景的处理策略:

- 密钥无效错误
  - 浏览器端捕获 OpenRouter API 认证失败错误(401)
  - 提示用户密钥无效
  - 提供重新输入密钥选项
  
- 网络错误
  - 捕获与 OpenRouter API 的网络请求失败
  - 显示网络连接错误提示
  - 提供重试选项
  
- API 调用错误
  - 使用 streamText 的 onError 回调捕获错误
  - 显示通用错误提示
  - 允许用户继续对话

## 前端架构设计

### 页面结构

应用采用纯前端单页面设计,主要页面和组件包括:

- 主页面 (+page.svelte)
  - 负责应用整体布局
  - 管理密钥初始化状态
  - 条件渲染密钥输入或聊天界面
  
- KeyInput 组件
  - 密钥输入表单
  - 密钥验证逻辑(可选,通过测试请求验证)
  - 密钥存储到 IndexedDB
  
- ChatInterface 组件
  - 聊天界面主容器
  - 管理 OpenRouter provider 实例
  - 调用 AI SDK Core 的 streamText
  - 管理消息状态和流式响应
  
- MessageList 组件
  - 消息列表渲染
  - 滚动控制
  - 消息气泡样式
  
- MessageInput 组件
  - 消息输入框
  - 发送按钮
  - 输入状态管理

### 状态管理

应用状态管理策略,使用 Svelte 5 Runes:

- 密钥状态
  - 使用 `$state` rune 管理密钥加载和存储状态
  - IndexedDB 作为持久化层
  - 应用初始化时从 IndexedDB 加载密钥
  - 密钥变更时同步更新 IndexedDB
  
- 聊天状态
  - 使用 `$state` rune 管理消息数组和 UI 状态
  - 使用 `$derived` rune 计算派生状态(如是否可发送)
  - 使用 `$effect` rune 处理副作用(如自动滚动到底部)
  - 手动调用 streamText 并处理流式响应
  - 通过迭代器实时更新消息内容

### IndexedDB 数据结构

定义 IndexedDB 数据库结构:

- 数据库名称: `ai-chat-app`
- 版本号: 1

- 对象存储 `settings`
  - 键: `apiKey`
  - 值: 用户的 OpenRouter API 密钥字符串

## OpenRouter 集成方案

### Provider 配置

在浏览器端配置 OpenRouter provider:

- 安装 `@openrouter/ai-sdk-provider` 包
- 使用 createOpenRouter 创建 provider 实例
- 从 IndexedDB 读取用户密钥并传入 provider 配置
- 配置默认模型为 `meta-llama/llama-3.1-8b-instruct:free`

### 浏览器端直接调用

在前端组件中直接调用 AI SDK Core:

- 导入 streamText 函数从 'ai' 包
- 导入 createOpenRouter 从 '@openrouter/ai-sdk-provider'
- 创建 provider 实例时传入用户密钥
- 调用 streamText,传入 provider.chat() 模型和消息历史
- 使用 textStream 或 fullStream 迭代器接收响应
- 实时更新 Svelte 响应式变量显示消息内容

### 流式响应处理

处理 AI 流式响应的实现:

- 使用 for await...of 循环迭代 textStream
- 每次迭代获取文本片段并拼接到消息内容
- 实时更新消息数组触发 UI 重新渲染
- 流结束后更新消息状态为完成
- 使用 onError 回调处理错误情况

## 部署配置

### Cloudflare Pages 部署

应用作为纯静态站点部署至 Cloudflare Pages:

- 构建命令: `npm run build` 或 `pnpm build`
- 构建输出目录: `build` (静态文件输出)
- 根目录: 项目根目录
- 环境变量: 无需配置任何环境变量
- 部署类型: 纯静态网站,无需 Functions 或 Workers

### SvelteKit 适配器

使用静态适配器配置 SvelteKit:

- 安装 `@sveltejs/adapter-static`
- 配置 `svelte.config.js` 使用静态适配器
- 预渲染所有页面为静态 HTML
- 输出纯静态文件,通过 CDN 全球分发

### 本地开发环境

本地开发和测试配置:

- 使用 `pnpm dev` 启动开发服务器
- 开发服务器运行在 Node.js 环境
- AI SDK Core 在浏览器端运行,与生产环境一致
- 热更新支持所有前端代码修改

### 静态资源

静态资源处理策略:

- 样式文件由 Tailwind CSS 编译生成
- 组件库资源由 shadcn-svelte 提供
- Cloudflare Pages 自动处理静态资源缓存和 CDN 分发

## 用户体验优化

### 加载状态

提供清晰的加载和处理状态反馈:

- 应用初始化时显示加载动画
- 密钥验证时显示验证中状态
- AI 响应时显示打字动画或加载指示器
- 网络请求失败时显示错误提示

### 响应式设计

适配不同设备尺寸:

- 桌面端: 固定宽度居中布局,最大宽度 800px
- 平板端: 自适应宽度,保持适当边距
- 移动端: 全宽布局,优化触摸交互

### 无障碍支持

基础无障碍功能:

- 语义化 HTML 标签
- 合理的 ARIA 标签
- 键盘导航支持
- 足够的颜色对比度

## 安全性考虑

### 密钥安全(最主要风险)

保护用户 API 密钥的安全措施和风险说明:

- 存储安全
  - 密钥持久化存储仅在用户本地 IndexedDB
  - IndexedDB 受同源策略保护,其他网站无法访问
  - 浏览器扩展和开发者工具可以查看 IndexedDB 内容(需提示用户注意)
  
- 传输安全
  - 密钥通过 HTTPS 直接从浏览器发送到 OpenRouter API
  - 密钥不经过任何中间服务器或代理
  - TLS 加密保护传输过程中的密钥安全
  
- 用户提示
  - 界面明确告知用户密钥存储位置和使用方式
  - 提示用户不要在公共设备上使用或使用后清除密钥
  - 提供删除密钥功能方便用户清空本地存储

### 内容安全

防止恶意内容的基本措施:

- XSS 攻击防护
  - Svelte 自动转义模板中的所有动态内容
  - 不使用 {@html} 标签渲染用户输入或 AI 响应
  - 单用户环境,不存在跨用户 XSS 攻击风险
  
- AI 生成内容风险
  - AI 可能生成包含恶意链接的内容
  - 建议在 UI 层面添加链接警告提示
  - 用户需谨慎验证 AI 生成的链接和建议

### 依赖安全

依赖包供应链安全:

- 使用 package-lock.json 或 pnpm-lock.yaml 锁定依赖版本
- 优先使用官方和验证过的 npm 包
- 定期更新依赖修复已知漏洞
- 可使用 npm audit 检查安全风险

### HTTPS 部署

确保通信安全:

- Cloudflare Pages 默认提供 HTTPS
- 强制使用 HTTPS 访问应用
- 浏览器到 OpenRouter API 的连接通过 TLS 加密
- 同源策略保护敏感数据不被跨域访问

## 性能优化策略

### 代码分割

优化应用加载性能:

- SvelteKit 自动进行路由级代码分割
- 按需加载组件和模块
- 减小初始加载体积

### 流式渲染

提升响应速度感知:

- 使用 AI SDK 的流式文本生成
- 实时显示 AI 响应内容
- 避免等待完整响应后再显示

### IndexedDB 优化

优化数据存储访问:

- 异步读写操作,避免阻塞 UI
- 缓存常用数据,减少数据库访问
- 合理使用索引提升查询效率
