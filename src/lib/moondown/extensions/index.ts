/**
 * Moondown Extensions - 扩展功能模块
 * 
 * 包含：
 * - Debug: 调试面板与状态管理
 * - Prism: 代码高亮
 * - CSS: lunar-eclipse 强化样式
 */

// ============================================
// 统一日志系统
// ============================================

const DEBUG = import.meta.env.DEV;

/** 模块颜色配置 - 高区分度配色 */
const MODULE_COLORS = {
    Loader: '#60a5fa',   // 🔵 蓝色 - 资源加载
    Engine: '#a855f7',   // 🟣 紫色 - 解析引擎
    Stream: '#34d399',   // 🟢 翠绿 - 流式状态
    Gravity: '#fb923c',  // 🟠 橙色 - 缓冲游标
    Perf: '#f43f5e',     // 🔴 洋红 - 性能统计
} as const;

export type MoonModule = keyof typeof MODULE_COLORS;

/**
 * 统一日志输出函数
 * @param module 模块名
 * @param emoji 动作图标
 * @param desc 描述文本
 * @param data 键值对数据
 * @param instanceId 可选的实例ID后缀
 */
export function moonLog(
    module: MoonModule,
    emoji: string,
    desc: string,
    data?: Record<string, string | number | boolean>,
    instanceId?: string
): void {
    if (!DEBUG) return;

    const color = MODULE_COLORS[module];
    const idSuffix = instanceId ? ` ${instanceId.slice(0, 4)}` : '';
    const prefix = `[🌚 moondown ${module}${idSuffix}]`;

    let message = `${prefix} ${emoji} ${desc}`;

    if (data) {
        const pairs = Object.entries(data)
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ');
        message += ` | ${pairs}`;
    }

    console.log(`%c${message}`, `color: ${color}`);
}

/**
 * 性能数值格式化
 */
export function formatMs(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms.toFixed(0)}ms`;
}

export function formatSpeed(chars: number, ms: number): string {
    const speed = ms > 0 ? Math.round(chars / (ms / 1000)) : 0;
    return `${speed}c/s`;
}

// ============================================
// 调试工具
// ============================================

export { default as MoonDebug } from './MoonDebug.svelte';
export {
    debugState,
    updateDebugState,
    clearDebugState,
    type GravityDebugState
} from './debugStore';

// ============================================
// 代码高亮 (动态导入，避免首屏加载)
// ============================================

// 使用方式: const { highlightElement } = await import('./extensions/prismLoader');
// export { highlightElement, getPrism } from './prismLoader';

// ============================================
// 数学公式 (动态导入，避免首屏加载 KaTeX)
// ============================================

// 使用方式: const { default: MathRenderer } = await import('./extensions/MathRenderer.svelte');
// 使用方式: const { mathLoader } = await import('./extensions/mathLoader');

// ============================================
// 流程图 (动态导入，避免首屏加载 Mermaid)
// ============================================

// 使用方式: const { default: MermaidRenderer } = await import('./extensions/MermaidRenderer.svelte');
// 使用方式: const { loadMermaid, renderMermaid } = await import('./extensions/mermaidLoader');

