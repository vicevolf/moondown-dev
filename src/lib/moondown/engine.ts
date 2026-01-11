import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import type { RootContent, Parent, Text, InlineCode, Code } from 'mdast';

export type BlockStatus = 'stable' | 'pending';

/**
 * 字符范围信息
 * 用于追踪 AST 节点对应的可见字符位置
 */
export interface RangeInfo {
    charStart: number;  // 可见字符起始位置 (inclusive)
    charEnd: number;    // 可见字符结束位置 (exclusive)
}

/**
 * 带范围信息的 AST 节点
 * 通过 __range 属性扩展原有节点
 */
export type RangedNode<T = RootContent> = T & {
    __range?: RangeInfo;
};

export interface RenderBlock {
    id: string;
    status: BlockStatus;
    node: RangedNode<RootContent>;
    range: RangeInfo;  // 块级字符范围
}

// 调试开关：开发模式自动启用
const DEBUG = import.meta.env.DEV;

export class MoondownEngine {
    private cursor = 0;
    private stableBlocks: RenderBlock[] = [];
    private blockCounter = 0;
    private instanceId = Math.random().toString(36).slice(2);
    private currentPendingId = `moondown-pending-${this.instanceId}-${Date.now()}`;

    // 缓存：避免重复计算和数组创建
    private lastInputLength = 0;
    private cachedResult: RenderBlock[] = [];
    private lastStableCount = 0; // 追踪上次稳定块数量，用于结构共享

    private parseOptions: {
        extensions: any[];
        mdastExtensions: any[];
    } = {
            extensions: [gfm()],
            mdastExtensions: [gfmFromMarkdown()]
        };

    /**
     * 动态添加扩展 (如 LaTeX)
     */
    addExtensions(extensions: {
        extensions?: any[];
        mdastExtensions?: any[];
    }) {
        if (extensions.extensions) {
            this.parseOptions.extensions.push(...extensions.extensions);
        }
        if (extensions.mdastExtensions) {
            this.parseOptions.mdastExtensions.push(...extensions.mdastExtensions);
        }
    }

    private log(message: string, color = '#9b59b6') {
        if (DEBUG) {
            console.log(`%c[🌙 Moondown ${this.instanceId.slice(0, 4)}] ${message}`, `color: ${color}`);
        }
    }

    /**
     * 递归标注 AST 节点的原始文本范围
     * 使用 AST 节点的 position 信息，确保与原始文本长度一致
     * @param node AST 节点
     * @param baseOffset 基础偏移量（用于增量解析时的偏移校正）
     * @returns 节点的结束偏移量
     */
    private annotateRanges(node: RangedNode, baseOffset: number): number {
        // 优先使用 AST 的 position 信息
        if (node.position) {
            const start = baseOffset + (node.position.start.offset ?? 0);
            const end = baseOffset + (node.position.end.offset ?? 0);
            node.__range = { charStart: start, charEnd: end };

            // 递归处理子节点（确保它们也有 __range）
            if ('children' in node) {
                const parentNode = node as RangedNode<Parent>;
                for (const child of parentNode.children) {
                    this.annotateRanges(child as RangedNode, baseOffset);
                }
            }

            return end;
        }

        // 兜底：无 position 信息时使用可见字符计数（不应该发生）
        const startOffset = baseOffset;

        // 文本节点：直接计算字符长度
        if (node.type === 'text') {
            const textNode = node as RangedNode<Text>;
            const length = textNode.value.length;
            textNode.__range = { charStart: startOffset, charEnd: startOffset + length };
            return startOffset + length;
        }

        // 行内代码：value 就是可见字符
        if (node.type === 'inlineCode') {
            const codeNode = node as RangedNode<InlineCode>;
            const length = codeNode.value.length;
            codeNode.__range = { charStart: startOffset, charEnd: startOffset + length };
            return startOffset + length;
        }

        // 代码块：value 是代码内容
        if (node.type === 'code') {
            const codeNode = node as RangedNode<Code>;
            const length = codeNode.value.length;
            codeNode.__range = { charStart: startOffset, charEnd: startOffset + length };
            return startOffset + length;
        }

        // 分隔线、图片等无文本内容的节点
        if (node.type === 'thematicBreak' || node.type === 'image' || node.type === 'break') {
            node.__range = { charStart: startOffset, charEnd: startOffset };
            return startOffset;
        }

        // 容器节点：递归处理子节点
        if ('children' in node) {
            const parentNode = node as RangedNode<Parent>;
            let currentOffset = startOffset;

            for (const child of parentNode.children) {
                currentOffset = this.annotateRanges(child as RangedNode, currentOffset);
            }

            parentNode.__range = { charStart: startOffset, charEnd: currentOffset };
            return currentOffset;
        }

        // 兜底：未知节点类型
        node.__range = { charStart: startOffset, charEnd: startOffset };
        return startOffset;
    }

    /**
     * 结构共享：智能合并输出数组，复用未变化块的引用
     * 核心优化：让 Svelte 的 keyed each 跳过未变化块的 Diff
     */
    private smartMerge(newBlocks: RenderBlock[]): RenderBlock[] {
        const oldResult = this.cachedResult;
        const currentStableCount = this.stableBlocks.length;

        // Case 1: 首次调用或重置后，无可复用引用
        if (oldResult.length === 0) {
            this.lastStableCount = currentStableCount;
            return newBlocks;
        }

        // Case 2: 稳定块数量未变（仅 pending 块内容更新）
        // 复用整个 oldResult 的前 N-1 个引用，只替换最后一个 pending
        if (currentStableCount === this.lastStableCount && oldResult.length === newBlocks.length) {
            const lastIndex = oldResult.length - 1;
            // 直接复用旧数组的稳定块部分
            const merged = oldResult.slice(0, lastIndex);
            merged.push(newBlocks[lastIndex]);
            this.log(`♻️ 结构共享: 复用 ${lastIndex} 个块引用 (pending 更新)`, '#1abc9c');
            return merged;
        }

        // Case 3: 新增了稳定块（老的 pending 变成了 stable）
        if (currentStableCount > this.lastStableCount) {
            // stableBlocks 数组本身的引用是稳定的（通过 push 追加）
            // 关键：复用 stableBlocks 中已有的块对象引用
            this.log(`♻️ 结构共享: 新增 ${currentStableCount - this.lastStableCount} 个稳定块，复用 ${this.lastStableCount} 个旧引用`, '#1abc9c');
            this.lastStableCount = currentStableCount;
            return newBlocks;
        }

        // Case 4: 其他情况（如块减少），返回新数组
        this.lastStableCount = currentStableCount;
        return newBlocks;
    }

    /**
     * 增量处理函数
     * @param fullText 完整的流式输入文本
     * @returns 渲染块数组（带字符范围标注）
     */
    process(fullText: string): RenderBlock[] {
        // 快速路径：内容无变化直接返回缓存
        if (fullText.length === this.lastInputLength) {
            return this.cachedResult;
        }
        this.lastInputLength = fullText.length;

        // 1. 重置检测：如果新文本比游标位置短，说明内容被重置
        if (fullText.length < this.cursor) {
            this.log('⚠️ 检测到内容重置，重新初始化引擎', '#e74c3c');
            this.reset();
        }

        // 2. 获取增量切片（从游标位置开始）
        const textToParse = fullText.slice(this.cursor);
        if (!textToParse) {
            this.cachedResult = this.stableBlocks;
            return this.cachedResult;
        }

        // 3. 局部解析增量文本
        const root = fromMarkdown(textToParse, this.parseOptions);
        const children = root.children;

        this.log(`解析增量 +${textToParse.length} 字符 → ${children.length} 个节点 | 游标: ${this.cursor}`, '#3498db');

        // 4. 提交守卫 (Commit Guard)
        // 只有当节点数量 > 1 时，前 N-1 个节点才是安全闭合的
        if (children.length > 1) {
            const pendingCount = 1;
            const newStableNodes = children.slice(0, children.length - pendingCount);
            const lastStableNode = newStableNodes[newStableNodes.length - 1];

            if (lastStableNode.position?.end.offset) {
                const consumedLength = lastStableNode.position.end.offset;

                if (consumedLength > 0) {
                    // 归档到 Stable 区（带范围标注）
                    for (const node of newStableNodes) {
                        const rangedNode = node as RangedNode;
                        // 使用 cursor 作为基础偏移，annotateRanges 会使用 AST position 计算范围
                        const blockCharEnd = this.annotateRanges(rangedNode, this.cursor);
                        const blockCharStart = rangedNode.__range?.charStart ?? this.cursor;

                        this.stableBlocks.push({
                            id: `moondown-stable-${this.instanceId}-${++this.blockCounter}`,
                            status: 'stable',
                            node: rangedNode,
                            range: { charStart: blockCharStart, charEnd: blockCharEnd }
                        });
                    }

                    this.log(`✅ 提交 ${newStableNodes.length} 个稳定块 (${newStableNodes.map(n => n.type).join(', ')}) | 总稳定块: ${this.stableBlocks.length} | 字符范围: 0-${this.cursor + consumedLength}`, '#27ae60');

                    // 推进游标
                    const oldCursor = this.cursor;
                    this.cursor += consumedLength;
                    this.log(`📍 游标推进: ${oldCursor} → ${this.cursor} (+${consumedLength})`, '#f39c12');

                    // 生成新的 Pending ID
                    this.currentPendingId = `moondown-pending-${this.instanceId}-${Date.now()}-${this.blockCounter}`;
                }
            }
        }

        // 5. 组装 Pending 块（最后一个未闭合的节点，带范围标注）
        const pendingBlocks: RenderBlock[] = [];
        if (children.length > 0) {
            const pendingNode = children[children.length - 1] as RangedNode;
            // 使用 cursor 作为基础偏移，annotateRanges 会使用 AST position 计算范围
            const blockCharEnd = this.annotateRanges(pendingNode, this.cursor);
            const blockCharStart = pendingNode.__range?.charStart ?? this.cursor;

            pendingBlocks.push({
                id: this.currentPendingId,
                status: 'pending',
                node: pendingNode,
                range: { charStart: blockCharStart, charEnd: blockCharEnd }
            });
            this.log(`⏳ Pending 块: ${pendingNode.type} | 输出: ${this.stableBlocks.length} stable + 1 pending | 范围: ${blockCharStart}-${blockCharEnd}`, '#9b59b6');
        }

        // 结构共享：智能合并，复用未变化块的引用
        const newResult = pendingBlocks.length > 0
            ? [...this.stableBlocks, ...pendingBlocks]
            : this.stableBlocks;
        this.cachedResult = this.smartMerge(newResult);
        return this.cachedResult;
    }

    /**
     * 重置待定状态（用于动态加载插件后触发重新解析）
     * 不会清除已提交的 Stable 块
     */
    resetPending() {
        this.log('🔄 重置待定块缓存（保留 Stable 块）', '#e67e22');
        this.lastInputLength = 0; // 强制 process() 重新执行
        this.currentPendingId = `moondown-pending-${this.instanceId}-${Date.now()}`;
        // 清除缓存中的 pending 部分，保留 stable 部分
        this.cachedResult = [...this.stableBlocks];
    }

    /**
     * 重置引擎状态
     */
    reset(): void {
        this.log('🔄 引擎重置', '#e74c3c');
        this.cursor = 0;
        this.stableBlocks = [];
        this.blockCounter = 0;
        this.instanceId = Math.random().toString(36).slice(2);
        this.currentPendingId = `moondown-pending-${this.instanceId}-${Date.now()}`;
        this.lastInputLength = 0;
        this.cachedResult = [];
        this.lastStableCount = 0;
    }
}
