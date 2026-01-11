<script lang="ts">
    import { onDestroy } from "svelte";
    import { MoondownEngine, type RenderBlock } from "./engine";
    import { BASE_THROTTLE_SECONDS } from "./moonGravity";
    import MoonRider from "./MoonRider.svelte";
    import { mathLoader } from "./mathLoader";

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

    // 调试开关
    const DEBUG = import.meta.env.DEV;

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
            if (DEBUG) {
                console.log(
                    `%c[🌙 Moondown] 跳过解析: engine=${!!engine}, 内容相同=${text === lastContent}`,
                    "color: #95a5a6",
                );
            }
            return;
        }
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

    /**
     * 自动检测 LaTeX 语法并按需加载支持库
     * 策略：
     * 1. 检查是否存在 $ 符号（避免无关文本加载）
     * 2. 调用 mathLoader 懒加载
     * 3. 加载完成后，更新引擎配置并重置解析
     */
    $effect(() => {
        if (!content || !engine) return;

        // 如果当前实例已经启用了 Math，无需重复处理
        if (mathEnabled) return;

        // 简单的启发式检测：检查是否包含 $ 符号
        // 注意：这可能会有假阳性，但作为懒加载触发条件是可以接受的
        if (content.includes("$")) {
            // 立即标记为已启用，防止在异步加载期间重复触发
            mathEnabled = true;

            mathLoader.load().then((modules) => {
                if (!engine) return;

                // 扩展引擎配置
                engine.addExtensions({
                    extensions: [modules.math()],
                    mdastExtensions: [modules.mathFromMarkdown()],
                });

                if (DEBUG) {
                    console.log(
                        "[🌙 Moondown] LaTeX 支持已激活，重置引擎以应用新语法",
                    );
                }

                // 重置引擎并立即重新解析完整内容
                // 因为语法规则变了，之前的增量解析可能不正确（例如 $ 被当成了普通文本）
                engine.reset();
                lastContent = ""; // 强制 parse 不跳过
                parse(content);
            });
        }
    });

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
            if (DEBUG) {
                const lastBlockRange =
                    blocks.length > 0 ? blocks[blocks.length - 1].range : null;
                console.log(
                    `%c[🌙 Moondown] 流结束前状态%c | content长度: %c${content.length}%c | lastContent长度: %c${lastContent.length}%c | 最后块范围: %c${lastBlockRange ? `${lastBlockRange.charStart}-${lastBlockRange.charEnd}` : "N/A"}%c | 有待定解析: %c${hadPendingTimeout}`,
                    "color: #e67e22; font-weight: bold",
                    "color: #888",
                    "color: #3498db; font-weight: bold",
                    "color: #888",
                    "color: #9b59b6; font-weight: bold",
                    "color: #888",
                    "color: #27ae60; font-weight: bold",
                    "color: #888",
                    hadPendingTimeout
                        ? "color: #e74c3c; font-weight: bold"
                        : "color: #27ae60",
                );
            }

            // 强制最终解析（无论 lastContent 状态如何）
            // engine.process() 内部有去重逻辑，重复调用不会有性能问题
            lastContent = content;
            blocks = engine.process(content);

            // 调试：记录最终解析结果
            if (DEBUG) {
                const finalBlockRange =
                    blocks.length > 0 ? blocks[blocks.length - 1].range : null;
                console.log(
                    `%c[🌙 Moondown] 最终解析完成%c | 块数: %c${blocks.length}%c | 最后块范围: %c${finalBlockRange ? `${finalBlockRange.charStart}-${finalBlockRange.charEnd}` : "N/A"}`,
                    "color: #27ae60; font-weight: bold",
                    "color: #888",
                    "color: #3498db; font-weight: bold",
                    "color: #888",
                    "color: #27ae60; font-weight: bold",
                );
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
