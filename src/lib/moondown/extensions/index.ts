/**
 * Moondown Extensions - 扩展功能模块
 * 
 * 包含：
 * - Debug: 调试面板与状态管理
 * - Prism: 代码高亮
 * - CSS: lunar-eclipse 强化样式
 */

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
// 代码高亮
// ============================================

export { highlightElement, getPrism } from './prismLoader';
