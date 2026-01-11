/**
 * Moondown - 流式 Markdown 渲染组件库
 * 
 * 主要组件：
 * - MoonGravity: 带物理缓冲的流式渲染（推荐用于 AI 聊天场景）
 * - Moondown: 基础 Markdown 渲染（用于静态内容或自定义控制）
 * 
 * @example
 * ```svelte
 * <!-- 流式渲染（推荐） -->
 * <script>
 *   import { MoonGravity } from '$lib/moondown';
 * </script>
 * <MoonGravity content={streamingText} isStreaming={!isComplete} />
 * 
 * <!-- 静态渲染 -->
 * <script>
 *   import { Moondown } from '$lib/moondown';
 * </script>
 * <Moondown content={markdownText} />
 * ```
 */

// ============================================
// 主要组件
// ============================================

/** 带物理缓冲的流式 Markdown 渲染组件 */
export { default as MoonGravity } from './MoonGravity.svelte';

/** 基础 Markdown 渲染组件 */
export { default as Moondown } from './Moondown.svelte';

// ============================================
// 内部组件（高级用法）
// ============================================

/** AST 节点渲染器 */
export { default as MoonRider } from './MoonRider.svelte';

/** 调试面板组件 */
export { default as MoonDebug } from './MoonDebug.svelte';

// ============================================
// 核心引擎
// ============================================

export { 
    MoondownEngine,
    type RenderBlock,
    type BlockStatus,
    type RangeInfo,
    type RangedNode
} from './engine';

// ============================================
// 物理缓冲区
// ============================================

export {
    TextBuffer,
    type BufferState,
    type BufferCallback
} from './moongravity';

// ============================================
// 调试工具
// ============================================

export {
    debugState,
    updateDebugState,
    clearDebugState,
    type GravityDebugState
} from './debugStore';
