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
        class?: string;
        isStreaming?: boolean;
    }

    let {
        content = "",
        class: className = "",
        isStreaming = true,
    }: Props = $props();

    // 引擎实例
    let engine: MoondownEngine | null = new MoondownEngine();

    // 去重用
    let lastContent = "";

    // 渲染结果
    let blocks = $state<RenderBlock[]>([]);

    // 解析
    function parse(text: string) {
        if (!engine || text === lastContent) return;
        lastContent = text;
        blocks = engine.process(text);
    }

    // 响应内容变化（直接解析，节流由 MoonGravity 控制）
    $effect(() => {
        if (!engine) return;

        if (!content) {
            lastContent = "";
            blocks = [];
            engine.reset();
            return;
        }

        parse(content);
    });

    // 单独监听流结束 - 只有 isStreaming 从 true 变为 false 时才释放
    // 注意：MoonGravity 传入的 isStreaming = !isBufferComplete
    // isBufferComplete 需要 isEnded === true 才会变成 true
    // 所以网络卡顿导致缓冲区暂时空了不会触发这里
    $effect(() => {
        if (!isStreaming && engine) {
            console.log("%c[🌙 Moondown] 流结束，引擎已释放", "color: #27ae60");
            engine = null;
        }
    });

    onDestroy(() => {
        engine = null;
    });
</script>

<div class={`moondown-root ${className}`}>
    {#each blocks as block (block.id)}
        <div class="moondown-block" data-status={block.status}>
            <MoonRider node={block.node} />
        </div>
    {/each}
</div>
