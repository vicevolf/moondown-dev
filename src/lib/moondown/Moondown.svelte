<script lang="ts">
    import { onDestroy } from "svelte";
    import { MoondownEngine, type RenderBlock } from "./engine";
    import MoonRider from "./MoonRider.svelte";

    // 导入 Moondown 排版系统 (缺省样式)
    import "./moondown.css";

    // 可选：增强强调效果 (加粗荧光笔背景 + 删除线主题色)
    import "./lunar-eclipse.css";

    interface Props {
        content: string;
        revealIndex?: number; // 可选：不传则显示全部
        class?: string;
        isStreaming?: boolean;
    }

    let {
        content = "",
        revealIndex = undefined,
        class: className = "",
        isStreaming = true,
    }: Props = $props();

    // 引擎实例
    let engine: MoondownEngine | null = new MoondownEngine();

    // 去重用
    let lastContent = "";

    // 渲染结果
    let blocks = $state<RenderBlock[]>([]);

    // 节流解析：500ms 间隔
    let parseTimeout: ReturnType<typeof setTimeout> | null = null;
    let pendingContent: string | null = null;

    function parse(text: string) {
        if (!engine || text === lastContent) return;
        lastContent = text;
        blocks = engine.process(text);
    }

    function throttledParse(text: string) {
        // 如果正在节流中，记录待解析内容
        if (parseTimeout) {
            pendingContent = text;
            return;
        }

        // 立即解析
        parse(text);

        // 设置节流定时器
        parseTimeout = setTimeout(() => {
            parseTimeout = null;
            // 如果有待解析内容，进行解析
            if (pendingContent !== null && pendingContent !== lastContent) {
                parse(pendingContent);
                pendingContent = null;
            }
        }, 500);
    }

    // 响应内容变化（节流解析）
    $effect(() => {
        if (!engine) return;

        if (!content) {
            lastContent = "";
            blocks = [];
            engine.reset();
            // 清理定时器
            if (parseTimeout) {
                clearTimeout(parseTimeout);
                parseTimeout = null;
                pendingContent = null;
            }
            return;
        }

        throttledParse(content);
    });

    // 单独监听流结束 - 只有 isStreaming 从 true 变为 false 时才释放
    // 注意：MoonGravity 传入的 isStreaming = !isBufferComplete
    // isBufferComplete 需要 isEnded === true 才会变成 true
    // 所以网络卡顿导致缓冲区暂时空了不会触发这里
    $effect(() => {
        if (!isStreaming && engine) {
            // 流结束时，确保最后一次解析
            if (pendingContent !== null) {
                parse(pendingContent);
                pendingContent = null;
            }
            if (parseTimeout) {
                clearTimeout(parseTimeout);
                parseTimeout = null;
            }
            console.log("%c[🌙 Moondown] 流结束，引擎已释放", "color: #27ae60");
            engine = null;
        }
    });

    onDestroy(() => {
        engine = null;
        if (parseTimeout) {
            clearTimeout(parseTimeout);
            parseTimeout = null;
        }
    });

    // 计算实际 revealIndex：未设置时显示全部
    const effectiveRevealIndex = $derived(
        revealIndex !== undefined ? revealIndex : Infinity,
    );
</script>

<div class={`moondown-root ${className}`}>
    {#each blocks as block (block.id)}
        <div class="moondown-block" data-status={block.status}>
            <MoonRider
                node={block.node}
                blockRange={block.range}
                revealIndex={effectiveRevealIndex}
            />
        </div>
    {/each}
</div>
