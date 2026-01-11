<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TextBuffer, type BufferState } from "./moongravity";
    import Moondown from "./Moondown.svelte";
    import { updateDebugState, clearDebugState } from "./debugStore";

    let {
        content,
        isStreaming = true,
    }: { content: string; isStreaming?: boolean } = $props();

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
            revealIndex = state.revealIndex;
            bufferSize = state.bufferSize;
            velocity = state.velocity;
            fullContent = buffer?.getFullContent() ?? "";
            isBufferComplete = state.isComplete;

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
        }
    });
</script>

<Moondown
    content={fullContent}
    {revealIndex}
    {velocity}
    isStreaming={!isBufferComplete}
/>
