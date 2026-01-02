<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TextBuffer, type BufferState } from "./moongravity";
    import Moondown from "./Moondown.svelte";

    let {
        content,
        isStreaming = true,
    }: { content: string; isStreaming?: boolean } = $props();

    // 缓冲区状态
    let displayedText = $state("");
    let bufferSize = $state(0);
    let velocity = $state(0);
    let isBufferComplete = $state(false);

    // 追踪上次处理的内容长度
    let lastProcessedLength = 0;
    let hasEnded = false;

    // 创建缓冲区实例
    let buffer: TextBuffer | null = null;

    onMount(() => {
        buffer = new TextBuffer((state: BufferState) => {
            displayedText = state.displayedText;
            bufferSize = state.bufferedText.length;
            velocity = state.velocity;

            if (
                state.isEnded &&
                state.bufferedText.length === 0 &&
                !state.isRunning
            ) {
                isBufferComplete = true;
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
    });

    // 监听内容变化，增量推送到缓冲区
    $effect(() => {
        if (!buffer) return;

        if (content.length > lastProcessedLength) {
            const newContent = content.slice(lastProcessedLength);
            buffer.push(newContent);
            lastProcessedLength = content.length;
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

    // 调试模式：开发环境自动启用
    const DEBUG = import.meta.env.DEV;
</script>

{#if DEBUG}
    <div
        style="
            position: fixed;
            top: 0.5rem;
            right: 0.5rem;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 0.75rem;
            padding: 0.5rem;
            border-radius: 0.25rem;
            font-family: monospace;
            z-index: 50;
        "
    >
        <div style="color: #34d399; font-weight: bold; margin-bottom: 0.25rem;">
            🌙 MoonGravity
        </div>
        <div>Buffer: {bufferSize} chars</div>
        <div>Speed: {velocity.toFixed(1)} c/s</div>
        <div>Displayed: {displayedText.length} / {content.length}</div>
        <div>Complete: {isBufferComplete ? "✅" : "⏳"}</div>
    </div>
{/if}

<Moondown content={displayedText} isStreaming={!isBufferComplete} />
