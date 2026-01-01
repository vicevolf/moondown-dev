<script lang="ts">
    import { onDestroy } from "svelte";
    import { MoondownEngine, type RenderBlock } from "./engine";
    import MoondownRenderer from "./MoondownRenderer.svelte";

    interface Props {
        content: string;
        class?: string;
        isStreaming?: boolean;
    }

    let {
        content = "",
        class: className = "",
        isStreaming = true,
    }: Props = $props();

    // 实例化引擎（组件级单例）
    let engine: MoondownEngine | null = new MoondownEngine();

    // 节流控制
    const PARSE_THROTTLE_MS = 40;
    let parseTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingContent: string | null = null;
    let lastParsedContent = "";

    // 渲染结果
    let blocks = $state<RenderBlock[]>([]);

    // 是否已释放资源
    let hasFinalized = false;

    // 实际解析函数
    function doParse(text: string) {
        if (!engine || text === lastParsedContent) return;
        lastParsedContent = text;
        blocks = engine.process(text);
    }

    // 释放资源
    function cleanup() {
        if (parseTimer) {
            clearTimeout(parseTimer);
            parseTimer = null;
        }
        pendingContent = null;
    }

    // 完全释放引擎资源（流结束后调用）
    function finalize() {
        if (hasFinalized) return;
        hasFinalized = true;

        cleanup();

        // 最后一次解析确保内容完整
        if (engine && content !== lastParsedContent) {
            blocks = engine.process(content);
        }

        // 释放引擎引用（AST 节点保留，因为组件仍需渲染）
        engine = null;
        console.log(
            "%c[🌙 Moondown] 引擎已释放，AST 节点保留用于渲染",
            "color: #27ae60",
        );
    }

    // 节流解析
    $effect(() => {
        const text = content;

        // 如果已释放，跳过
        if (hasFinalized || !engine) return;

        // 空内容直接重置
        if (!text) {
            cleanup();
            lastParsedContent = "";
            blocks = [];
            engine.reset();
            return;
        }

        // 如果有定时器在运行，只保存待处理内容
        if (parseTimer !== null) {
            pendingContent = text;
            return;
        }

        // 立即执行第一次解析
        doParse(text);

        // 设置节流定时器
        parseTimer = setTimeout(() => {
            parseTimer = null;

            // 处理待处理的内容
            if (
                pendingContent !== null &&
                pendingContent !== lastParsedContent
            ) {
                const pending = pendingContent;
                pendingContent = null;
                doParse(pending);
            }
        }, PARSE_THROTTLE_MS);
    });

    // 监听流结束
    $effect(() => {
        if (!isStreaming && !hasFinalized) {
            finalize();
        }
    });

    // 组件销毁时清理
    onDestroy(() => {
        cleanup();
        engine = null;
    });
</script>

<div class={`moondown-root w-full ${className}`}>
    {#each blocks as block (block.id)}
        <div class="moondown-block" data-status={block.status}>
            <MoondownRenderer node={block.node} />
        </div>
    {/each}
</div>
