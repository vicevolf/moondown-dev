<script lang="ts">
    import { MoondownEngine, type RenderBlock } from "$lib/moondownEngine";
    import MoondownRenderer from "./MoondownRenderer.svelte";

    interface Props {
        content: string;
        class?: string;
    }

    let { content = "", class: className = "" }: Props = $props();

    // 实例化引擎（组件级单例）
    const engine = new MoondownEngine();

    // 节流控制
    const PARSE_THROTTLE_MS = 40;
    let parseTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingContent: string | null = null;
    let lastParsedContent = "";

    // 渲染结果
    let blocks = $state<RenderBlock[]>([]);

    // 实际解析函数
    function doParse(text: string) {
        if (text === lastParsedContent) return;
        lastParsedContent = text;
        blocks = engine.process(text);
    }

    // 节流解析
    $effect(() => {
        const text = content;

        // 空内容直接重置
        if (!text) {
            if (parseTimer) {
                clearTimeout(parseTimer);
                parseTimer = null;
            }
            pendingContent = null;
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
</script>

<div class={`moondown-root w-full ${className}`}>
    {#each blocks as block (block.id)}
        <div class="moondown-block" data-status={block.status}>
            <MoondownRenderer node={block.node} />
        </div>
    {/each}
</div>
