<script lang="ts">
    import { onDestroy } from "svelte";
    import { MoondownEngine, type RenderBlock } from "./engine";
    import { BASE_THROTTLE_SECONDS } from "./moonGravity";
    import MoonRider from "./MoonRider.svelte";
    import { mathLoader } from "./extensions/mathLoader";
    import { moonLog } from "./extensions";

    // 导入 Moondown 排版系统 (缺省样式)
    import "./moondown.css";

    // 可选：增强强调效果 (加粗荧光笔背景 + 删除线主题色)
    import "./extensions/lunar-eclipse.css";

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

    // 节流配置（基于 moongravity 的统一基准）
    const BASE_INTERVAL = BASE_THROTTLE_SECONDS * 1000; // 1x 基准

    let parseTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastParseTime = 0;

    // 计算节流间隔：速度 × 0.02，限制在 0.3x ~ 1x
    function getThrottleInterval(): number {
        const multiplier = Math.max(0.3, Math.min(1.0, velocity * 0.02));
        return BASE_INTERVAL * multiplier;
    }

    function parse(text: string) {
        if (!engine || text === lastContent) {
            moonLog("Stream", "⏭️", "解析跳过", {
                Engine: !!engine,
                SameContent: text === lastContent,
            });
            return;
        }

        // --- 增量语法检测优化 ---
        // 仅在尚未启用相关功能时，扫描新增文本片段
        if (!mathEnabled || !prismPreloaded) {
            let increment = text;
            // 优化：如果是纯追加模式，只扫描新增部分
            if (
                text.length > lastContent.length &&
                text.startsWith(lastContent)
            ) {
                increment = text.slice(lastContent.length);
            }

            // 1. LaTeX 检测
            if (!mathEnabled && increment.includes("$")) {
                mathEnabled = true;
                moonLog("Stream", "⚡", "插件激活", {
                    Plugin: "LaTeX",
                    Trigger: "MathSymbol",
                });

                mathLoader.load().then((modules) => {
                    if (!engine) return;

                    // 扩展引擎配置
                    engine.addExtensions({
                        extensions: [modules.math()],
                        mdastExtensions: [modules.mathFromMarkdown()],
                    });

                    // 优化：不完全重置，只重置 Pending 状态
                    // 这样已生成的 Stable 块（不含 $ 的部分）会保留，避免画面闪烁
                    engine.resetPending();
                    lastContent = ""; // 强制 parse 不跳过
                    // 使用最新的 content prop 进行重析
                    parse(content);
                });
            }

            // 2. Code Highlighting 预加载
            if (
                !prismPreloaded &&
                (increment.includes("```") || increment.includes("~~~"))
            ) {
                prismPreloaded = true;
                moonLog("Stream", "⚡", "插件激活", {
                    Plugin: "Prism",
                    Trigger: "CodeBlock",
                });
                // 动态导入，避免 prismLoader 被打包到首屏
                import("./extensions/prismLoader").then(({ loadPrism }) => loadPrism());
            }
        }
        // -----------------------

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
        throttledParse(content);
    });

    // 标记当前实例是否已启用 Math 支持
    let mathEnabled = false;
    // 标记当前实例是否已触发 Prism 预加载
    let prismPreloaded = false;

    // 单独监听流结束 - 只有 isStreaming 从 true 变为 false 时才释放
    // 注意：MoonGravity 传入的 isStreaming = !isBufferComplete
    // isBufferComplete 需要 isEnded === true 才会变成 true
    // 所以网络卡顿导致缓冲区暂时空了不会触发这里
    $effect(() => {
        if (!isStreaming && engine) {
            // 流结束时，清除待定的节流定时器
            const hadPendingTimeout = !!parseTimeout;
            if (parseTimeout) {
                clearTimeout(parseTimeout);
                parseTimeout = null;
            }

            // 调试：记录流结束时的状态
            const lastBlockRange =
                blocks.length > 0 ? blocks[blocks.length - 1].range : null;
            moonLog("Stream", "📊", "流态快照", {
                Len: content.length,
                LastBlock: lastBlockRange
                    ? `${lastBlockRange.charStart}-${lastBlockRange.charEnd}`
                    : "N/A",
                Pending: hadPendingTimeout,
            });

            // 强制最终解析（无论 lastContent 状态如何）
            // engine.process() 内部有去重逻辑，重复调用不会有性能问题
            lastContent = content;
            blocks = engine.process(content);

            // 调试：记录最终解析结果
            const finalBlockRange =
                blocks.length > 0 ? blocks[blocks.length - 1].range : null;
            moonLog("Stream", "✅", "解析终结", {
                Blocks: blocks.length,
                LastBlock: finalBlockRange
                    ? `${finalBlockRange.charStart}-${finalBlockRange.charEnd}`
                    : "N/A",
            });

            moonLog("Stream", "🏁", "实例销毁", { Action: "Engine Released" });
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
