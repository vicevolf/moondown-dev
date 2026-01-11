<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TextBuffer, type BufferState } from "./moongravity";
    import Moondown from "./Moondown.svelte";
    import { updateDebugState, clearDebugState } from "./debugStore";

    let {
        content,
        isStreaming = true,
        onContentUpdate,
    }: {
        content: string;
        isStreaming?: boolean;
        /** 内容渲染更新时的回调，用于触发吸底滚动等外部行为 */
        onContentUpdate?: () => void;
    } = $props();

    // 缓冲区状态
    let fullContent = $state("");
    let revealIndex = $state(0);
    let bufferSize = $state(0);
    let velocity = $state(0);
    let isBufferComplete = $state(false);

    // 追踪上次处理的内容长度
    let lastProcessedLength = 0;
    let hasEnded = false;

    // 实例唯一标识
    const instanceId = crypto.randomUUID();

    // 创建缓冲区实例
    let buffer: TextBuffer | null = null;

    onMount(() => {
        buffer = new TextBuffer((state: BufferState) => {
            const prevComplete = isBufferComplete;
            revealIndex = state.revealIndex;
            bufferSize = state.bufferSize;
            velocity = state.velocity;
            fullContent = buffer?.getFullContent() ?? "";
            isBufferComplete = state.isComplete;

            // 调试：isComplete 状态变化
            if (import.meta.env.DEV && !prevComplete && isBufferComplete) {
                console.log(
                    `%c[🌙 MoonGravity] isBufferComplete 变为 true%c | fullContent长度: %c${fullContent.length}%c | revealIndex: %c${revealIndex}`,
                    "color: #e74c3c; font-weight: bold",
                    "color: #888",
                    "color: #3498db; font-weight: bold",
                    "color: #888",
                    "color: #9b59b6; font-weight: bold",
                );
            }

            // 触发内容更新回调
            onContentUpdate?.();

            // 更新全局调试状态
            if (import.meta.env.DEV) {
                updateDebugState({
                    bufferSize,
                    velocity,
                    revealIndex,
                    fullContentLength: fullContent.length,
                    isComplete: isBufferComplete,
                    instanceId,
                });
            }
        });

        if (content) {
            buffer.push(content);
            lastProcessedLength = content.length;
        }

        if (!isStreaming) {
            buffer.end();
            hasEnded = true;
        }
    });

    onDestroy(() => {
        buffer?.destroy();
        // 清理调试状态
        if (import.meta.env.DEV) {
            clearDebugState(instanceId);
        }
    });

    // 监听内容变化，增量推送到缓冲区
    $effect(() => {
        if (!buffer) return;

        if (content.length > lastProcessedLength) {
            const newContent = content.slice(lastProcessedLength);
            buffer.push(newContent);
            lastProcessedLength = content.length;
            // 同步更新 fullContent
            fullContent = buffer.getFullContent();
        }
    });

    // 监听流结束
    $effect(() => {
        if (!buffer || hasEnded) return;

        if (!isStreaming) {
            buffer.end();
            hasEnded = true;
            if (import.meta.env.DEV) {
                console.log(
                    `%c[🌙 MoonGravity] 流结束信号%c | fullContent长度: %c${fullContent.length}%c | revealIndex: %c${revealIndex}`,
                    "color: #e67e22; font-weight: bold",
                    "color: #888",
                    "color: #3498db; font-weight: bold",
                    "color: #888",
                    "color: #9b59b6; font-weight: bold",
                );
            }
        }
    });
</script>

<Moondown
    content={fullContent}
    {revealIndex}
    {velocity}
    isStreaming={!isBufferComplete}
/>
