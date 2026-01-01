<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { TextBuffer, type BufferState } from "$lib/textBuffer";
    import Moondown from "./Moondown.svelte";

    let {
        content,
        id,
        isStreaming = true,
    }: { content: string; id: string; isStreaming?: boolean } = $props();

    // 缓冲区状态
    let displayedText = $state("");
    let bufferSize = $state(0);
    let velocity = $state(0);

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
        });

        // 初始内容推入缓冲区
        if (content) {
            buffer.push(content);
            lastProcessedLength = content.length;
        }

        // 如果初始就不是流式，直接结束
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

    // 调试模式
    const DEBUG = true;
</script>

{#if DEBUG}
    <div
        class="fixed top-2 right-2 bg-black/80 text-white text-xs p-2 rounded font-mono z-50"
    >
        <div class="text-emerald-400 font-bold mb-1">🌙 Moondown</div>
        <div>Buffer: {bufferSize} chars</div>
        <div>Speed: {velocity.toFixed(1)} c/s</div>
        <div>Displayed: {displayedText.length} / {content.length}</div>
    </div>
{/if}

<Moondown content={displayedText} />
