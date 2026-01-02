import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import type { RootContent } from 'mdast';

export type BlockStatus = 'stable' | 'pending';

export interface RenderBlock {
    id: string;
    status: BlockStatus;
    node: RootContent;
}

// 调试开关
const DEBUG = true;

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

    private parseOptions = {
        extensions: [gfm()],
        mdastExtensions: [gfmFromMarkdown()]
    };

    private log(message: string, color = '#9b59b6') {
        if (DEBUG) {
            console.log(`%c[🌙 Moondown ${this.instanceId.slice(0, 4)}] ${message}`, `color: ${color}`);
        }
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
     * @returns 渲染块数组
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
                    // 归档到 Stable 区
                    for (const node of newStableNodes) {
                        this.stableBlocks.push({
                            id: `moondown-stable-${this.instanceId}-${++this.blockCounter}`,
                            status: 'stable',
                            node
                        });
                    }

                    this.log(`✅ 提交 ${newStableNodes.length} 个稳定块 (${newStableNodes.map(n => n.type).join(', ')}) | 总稳定块: ${this.stableBlocks.length}`, '#27ae60');

                    // 推进游标
                    const oldCursor = this.cursor;
                    this.cursor += consumedLength;
                    this.log(`📍 游标推进: ${oldCursor} → ${this.cursor} (+${consumedLength})`, '#f39c12');

                    // 生成新的 Pending ID
                    this.currentPendingId = `moondown-pending-${this.instanceId}-${Date.now()}-${this.blockCounter}`;
                }
            }
        }

        // 5. 组装 Pending 块（最后一个未闭合的节点）
        const pendingBlocks: RenderBlock[] = [];
        if (children.length > 0) {
            const pendingNode = children[children.length - 1];
            pendingBlocks.push({
                id: this.currentPendingId,
                status: 'pending',
                node: pendingNode
            });
            this.log(`⏳ Pending 块: ${pendingNode.type} | 输出: ${this.stableBlocks.length} stable + 1 pending`, '#9b59b6');
        }

        // 结构共享：智能合并，复用未变化块的引用
        const newResult = pendingBlocks.length > 0
            ? [...this.stableBlocks, ...pendingBlocks]
            : this.stableBlocks;
        this.cachedResult = this.smartMerge(newResult);
        return this.cachedResult;
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
