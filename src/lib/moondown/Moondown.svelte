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
        velocity?: number; // 物理速度 (字符/秒)
        class?: string;
        isStreaming?: boolean;
    }

    let {
        content = "",
        revealIndex = undefined,
        velocity = 0,
        class: className = "",
        isStreaming = true,
    }: Props = $props();

    // 引擎实例
    let engine: MoondownEngine | null = new MoondownEngine();

    // 去重用
    let lastContent = "";

    // 渲染结果
    let blocks = $state<RenderBlock[]>([]);

    // 节流配置
    const BASE_INTERVAL = 1000; // 基准间隔 1 秒

    let parseTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastParseTime = 0;

    // 计算节流间隔：速度 × 0.02，限制在 0.3x ~ 1x
    function getThrottleInterval(): number {
        const multiplier = Math.max(0.3, Math.min(1.0, velocity * 0.02));
        return BASE_INTERVAL * multiplier;
    }

    function parse(text: string) {
        if (!engine || text === lastContent) return;
        lastContent = text;
        blocks = engine.process(text);
        lastParseTime = Date.now();
    }

    function throttledParse(text: string) {
        const now = Date.now();
        const timeSinceLastParse = now - lastParseTime;
        const interval = getThrottleInterval();

        // 清除旧的待定定时器
        if (parseTimeout) {
            clearTimeout(parseTimeout);
            parseTimeout = null;
        }

        if (timeSinceLastParse >= interval) {
            // 已超过节流间隔，立即解析
            parse(text);
        } else {
            // 还在节流期内，延迟到下次可用时间点
            const delay = interval - timeSinceLastParse;
            parseTimeout = setTimeout(() => {
                parseTimeout = null;
                parse(text);
            }, delay);
        }
    }

    // 响应内容变化（节流解析）
    $effect(() => {
        if (!engine) return;

        if (!content) {
            lastContent = "";
            blocks = [];
            engine.reset();
            // 清理定时器和状态
            if (parseTimeout) {
                clearTimeout(parseTimeout);
                parseTimeout = null;
            }
            lastParseTime = 0;
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
            // 流结束时，确保最后一次用最新内容解析
            if (parseTimeout) {
                clearTimeout(parseTimeout);
                parseTimeout = null;
            }
            // 强制最终解析
            if (content !== lastContent) {
                parse(content);
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
