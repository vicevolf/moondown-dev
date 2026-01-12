/**
 * Mermaid.js 动态加载器
 * 参考 prismLoader.ts / mathLoader.ts 模式
 * 只有当页面存在 mermaid 代码块时才会加载
 */

import { moonLog, formatMs } from './index';

// Mermaid 加载状态
let mermaidReady = false;
let mermaidLoading: Promise<void> | null = null;
let mermaidInstance: any = null;

// 渲染计数器（用于生成唯一 ID）
let renderCounter = 0;

/**
 * 加载 Mermaid 库
 */
export async function loadMermaid(): Promise<void> {
    if (mermaidReady && mermaidInstance) {
        return;
    }

    if (mermaidLoading) {
        return mermaidLoading;
    }

    mermaidLoading = (async () => {
        moonLog('Loader', '⏳', '资源加载', { Resource: 'Mermaid' });
        const startTime = performance.now();

        try {
            // 动态导入 mermaid
            const mermaid = await import('mermaid');
            mermaidInstance = mermaid.default || mermaid;

            // 初始化配置
            mermaidInstance.initialize({
                startOnLoad: false,
                theme: 'default',
                securityLevel: 'loose',
                fontFamily: 'inherit',
            });

            moonLog('Loader', '✅', '资源就绪', {
                Resource: 'Mermaid',
                '耗时': formatMs(performance.now() - startTime)
            });
            mermaidReady = true;
        } catch (err) {
            console.error('[🌚 Loader] Mermaid 加载失败:', err);
            throw err;
        }
    })();

    return mermaidLoading;
}

/**
 * 渲染 Mermaid 图表
 * @param code Mermaid 语法代码
 * @returns SVG 字符串，失败时返回 null
 */
export async function renderMermaid(code: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    if (!code?.trim()) return null;

    try {
        await loadMermaid();

        if (!mermaidInstance) {
            return null;
        }

        // 生成唯一 ID
        const id = `mermaid-${Date.now()}-${++renderCounter}`;

        // 渲染为 SVG
        const { svg } = await mermaidInstance.render(id, code);
        return svg;
    } catch (err) {
        console.error('[🌚 Loader] Mermaid 渲染失败:', err);
        return null;
    }
}

/**
 * 获取 Mermaid 实例
 */
export function getMermaid(): any {
    return mermaidInstance;
}

/**
 * 检查 Mermaid 是否已加载
 */
export function isMermaidReady(): boolean {
    return mermaidReady;
}
