# AI 聊天演示应用

基于 SvelteKit 的纯前端 AI 聊天应用,使用 OpenRouter API,部署于 Cloudflare Pages。

## 特性

- ✅ **纯前端架构** - 无需后端服务器,完全在浏览器中运行
- 🔑 **BYOK 模式** - 用户自行提供 OpenRouter API 密钥
- 🔒 **本地存储** - 密钥仅保存在浏览器 IndexedDB,不上传服务器
- 💬 **流式响应** - 实时显示 AI 回复内容
- 🎨 **响应式设计** - 适配桌面和移动设备
- 🚀 **静态部署** - 部署为纯静态网站,全球 CDN 加速

## 技术栈

- **SvelteKit** - Web 应用框架
- **Svelte 5** - 响应式组件框架 (Runes)
- **AI SDK Core** - AI 功能库
- **OpenRouter** - AI 模型网关
- **Tailwind CSS v4** - 样式框架
- **shadcn-svelte** - UI 组件库
- **IndexedDB** - 本地存储

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
```

构建输出在 `build` 目录

### 预览生产构建

```bash
npm run preview
```

## 使用说明

1. **获取 API 密钥**
   - 访问 [OpenRouter](https://openrouter.ai/keys) 注册并获取 API 密钥
   - 密钥格式: `sk-or-v1-...`

2. **首次使用**
   - 打开应用,输入 OpenRouter API 密钥
   - 密钥会保存在浏览器本地
   - 点击"开始使用"进入聊天界面

3. **开始对话**
   - 在输入框输入消息
   - 按 Enter 发送,Shift+Enter 换行
   - AI 将实时流式返回回复

4. **管理密钥**
   - 点击右上角"删除密钥"可清除本地密钥
   - 删除后需要重新输入

## 部署到 Cloudflare Pages

1. 推送代码到 GitHub
2. 在 Cloudflare Pages 创建新项目
3. 连接 GitHub 仓库
4. 配置构建设置:
   - 构建命令: `npm run build`
   - 构建输出目录: `build`
   - 根目录: `/`
5. 点击部署

## 隐私和安全

- ✅ 密钥仅存储在您的浏览器 IndexedDB 中
- ✅ 密钥通过 HTTPS 直接发送到 OpenRouter API
- ✅ 不经过任何中间服务器
- ⚠️ 浏览器扩展可以访问 IndexedDB,请注意
- ⚠️ 不要在公共设备上使用,或使用后删除密钥

## 默认模型

当前使用免费模型: `z-ai/glm-4.5-air:free` (智谱 GLM-4.5 Air)

## 许可证

MIT

## 参考

- [SvelteKit 文档](https://kit.svelte.dev/)
- [AI SDK 文档](https://sdk.vercel.ai/)
- [OpenRouter 文档](https://openrouter.ai/docs)
