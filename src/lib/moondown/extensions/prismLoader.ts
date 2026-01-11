/**
 * Prism.js 动态加载器
 * 使用官方 Autoloader 插件，自动从 CDN 按需加载语言组件
 * 只有当页面存在代码块时才会加载任何 Prism 相关资源
 */

const CDN_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.30.0';

// Prism 加载状态
let prismReady = false;
let prismLoading: Promise<void> | null = null;

// CSS 注入状态
let cssInjected = false;

/**
 * 动态加载脚本
 */
function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // 检查是否已加载
        if (document.querySelector(`script[src="${url}"]`)) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = url;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}

/**
 * 动态注入 Prism 主题 CSS
 * 使用自定义样式以匹配 moondown 设计系统
 */
function injectPrismCSS(): void {
    if (cssInjected) return;

    const styleId = 'moondown-prism-theme';
    if (document.getElementById(styleId)) {
        cssInjected = true;
        return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
/* Moondown Prism Theme - 动态注入 */
/* 基于 One Light / One Dark 配色方案 */

/* 亮色模式 token */
.moondown-root .moondown-code .token.comment,
.moondown-root .moondown-code .token.prolog,
.moondown-root .moondown-code .token.doctype,
.moondown-root .moondown-code .token.cdata {
    color: #6a737d;
    font-style: italic;
}

.moondown-root .moondown-code .token.punctuation {
    color: #24292e;
}

.moondown-root .moondown-code .token.property,
.moondown-root .moondown-code .token.tag,
.moondown-root .moondown-code .token.boolean,
.moondown-root .moondown-code .token.number,
.moondown-root .moondown-code .token.constant,
.moondown-root .moondown-code .token.symbol,
.moondown-root .moondown-code .token.deleted {
    color: #d73a49;
}

.moondown-root .moondown-code .token.selector,
.moondown-root .moondown-code .token.attr-name,
.moondown-root .moondown-code .token.string,
.moondown-root .moondown-code .token.char,
.moondown-root .moondown-code .token.builtin,
.moondown-root .moondown-code .token.inserted {
    color: #22863a;
}

.moondown-root .moondown-code .token.operator,
.moondown-root .moondown-code .token.entity,
.moondown-root .moondown-code .token.url,
.moondown-root .moondown-code .language-css .token.string,
.moondown-root .moondown-code .style .token.string {
    color: #d73a49;
}

.moondown-root .moondown-code .token.atrule,
.moondown-root .moondown-code .token.attr-value,
.moondown-root .moondown-code .token.keyword {
    color: #d73a49;
}

.moondown-root .moondown-code .token.function,
.moondown-root .moondown-code .token.class-name {
    color: #6f42c1;
}

.moondown-root .moondown-code .token.regex,
.moondown-root .moondown-code .token.important,
.moondown-root .moondown-code .token.variable {
    color: #e36209;
}

/* 深色模式 token */
@media (prefers-color-scheme: dark) {
    .moondown-root .moondown-code .token.comment,
    .moondown-root .moondown-code .token.prolog,
    .moondown-root .moondown-code .token.doctype,
    .moondown-root .moondown-code .token.cdata {
        color: #6b7280;
        font-style: italic;
    }

    .moondown-root .moondown-code .token.punctuation {
        color: #d1d5db;
    }

    .moondown-root .moondown-code .token.property,
    .moondown-root .moondown-code .token.tag,
    .moondown-root .moondown-code .token.boolean,
    .moondown-root .moondown-code .token.number,
    .moondown-root .moondown-code .token.constant,
    .moondown-root .moondown-code .token.symbol,
    .moondown-root .moondown-code .token.deleted {
        color: #f87171;
    }

    .moondown-root .moondown-code .token.selector,
    .moondown-root .moondown-code .token.attr-name,
    .moondown-root .moondown-code .token.string,
    .moondown-root .moondown-code .token.char,
    .moondown-root .moondown-code .token.builtin,
    .moondown-root .moondown-code .token.inserted {
        color: #4ade80;
    }

    .moondown-root .moondown-code .token.operator,
    .moondown-root .moondown-code .token.entity,
    .moondown-root .moondown-code .token.url,
    .moondown-root .moondown-code .language-css .token.string,
    .moondown-root .moondown-code .style .token.string {
        color: #f87171;
    }

    .moondown-root .moondown-code .token.atrule,
    .moondown-root .moondown-code .token.attr-value,
    .moondown-root .moondown-code .token.keyword {
        color: #f472b6;
    }

    .moondown-root .moondown-code .token.function,
    .moondown-root .moondown-code .token.class-name {
        color: #c4b5fd;
    }

    .moondown-root .moondown-code .token.regex,
    .moondown-root .moondown-code .token.important,
    .moondown-root .moondown-code .token.variable {
        color: #fbbf24;
    }
}
`;
    document.head.appendChild(style);
    cssInjected = true;
}

/**
 * 加载 Prism 核心 + Autoloader 插件
 */
async function loadPrism(): Promise<void> {
    if (prismReady && typeof window !== 'undefined' && (window as any).Prism) {
        return;
    }

    if (prismLoading) {
        return prismLoading;
    }

    prismLoading = (async () => {
        // 注入 CSS
        injectPrismCSS();

        // 加载 Prism 核心
        await loadScript(`${CDN_BASE}/prism.min.js`);

        const Prism = (window as any).Prism;
        if (!Prism) {
            throw new Error('Failed to load Prism');
        }

        // 禁用自动高亮
        Prism.manual = true;

        // 加载 Autoloader 插件
        await loadScript(`${CDN_BASE}/plugins/autoloader/prism-autoloader.min.js`);

        // 配置 Autoloader 使用 CDN 路径
        if (Prism.plugins?.autoloader) {
            Prism.plugins.autoloader.languages_path = `${CDN_BASE}/components/`;
        }

        prismReady = true;
    })();

    return prismLoading;
}

/**
 * 确保 Prism 已加载，然后高亮元素
 * Autoloader 会自动处理语言别名、依赖和按需加载
 */
export async function highlightElement(element: HTMLElement, lang: string): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!lang) return;

    // 确保 Prism + Autoloader 已加载
    await loadPrism();

    const Prism = (window as any).Prism;
    if (!Prism || !element) return;

    // 设置语言类名，Autoloader 会根据这个自动加载所需语言
    element.className = `language-${lang}`;

    // 高亮元素（Autoloader 会自动处理未加载的语言）
    Prism.highlightElement(element);
}

/**
 * 获取 Prism 实例
 */
export function getPrism(): any {
    return typeof window !== 'undefined' ? (window as any).Prism : null;
}
