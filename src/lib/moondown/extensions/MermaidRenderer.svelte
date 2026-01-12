<script lang="ts">
    import { renderMermaid } from "./mermaidLoader";
    import { moonLog } from "./index";

    interface Props {
        value: string;
    }

    let { value }: Props = $props();

    // 渲染状态
    let svgContent = $state<string | null>(null);
    let error = $state<string | null>(null);
    let isRendering = $state(false);
    let hasTriggered = false; // 避免重复日志

    // 响应 value 变化触发渲染
    $effect(() => {
        if (!value?.trim()) {
            svgContent = null;
            error = null;
            return;
        }

        // 首次渲染时输出激活日志
        if (!hasTriggered) {
            hasTriggered = true;
            moonLog("Stream", "⚡", "插件激活", {
                Plugin: "Mermaid",
                Trigger: "MermaidBlock",
            });
        }

        isRendering = true;
        error = null;

        renderMermaid(value)
            .then((svg) => {
                if (svg) {
                    svgContent = svg;
                    error = null;
                } else {
                    svgContent = null;
                    error = "渲染失败";
                }
            })
            .catch((err) => {
                svgContent = null;
                error = err?.message || "渲染失败";
            })
            .finally(() => {
                isRendering = false;
            });
    });
</script>

{#if isRendering}
    <div class="moondown-mermaid loading">
        <div class="moondown-mermaid-placeholder">加载中...</div>
    </div>
{:else if svgContent}
    <div class="moondown-mermaid">
        {@html svgContent}
    </div>
{:else if error}
    <div class="moondown-mermaid error">
        <div class="moondown-mermaid-error-title">⚠️ Mermaid 语法错误</div>
        <pre class="moondown-mermaid-source">{value}</pre>
    </div>
{:else}
    <div class="moondown-mermaid empty"></div>
{/if}

<style>
    .moondown-mermaid {
        margin: 1rem 0;
        overflow-x: auto;
    }

    .moondown-mermaid :global(svg) {
        max-width: 100%;
        height: auto;
        display: block;
    }

    .moondown-mermaid.loading {
        padding: 2rem;
        text-align: center;
        color: var(--text-secondary, #666);
    }

    .moondown-mermaid.error {
        border: 1px solid var(--error-border, #f87171);
        border-radius: 0.5rem;
        padding: 1rem;
        background: var(--error-bg, #fef2f2);
    }

    .moondown-mermaid-error-title {
        color: var(--error-text, #dc2626);
        font-weight: 500;
        margin-bottom: 0.5rem;
    }

    .moondown-mermaid-source {
        font-size: 0.875rem;
        overflow-x: auto;
        margin: 0;
        padding: 0.5rem;
        background: var(--code-bg, #f3f4f6);
        border-radius: 0.25rem;
    }

    @media (prefers-color-scheme: dark) {
        .moondown-mermaid.error {
            background: #450a0a;
            border-color: #991b1b;
        }

        .moondown-mermaid-error-title {
            color: #fca5a5;
        }

        .moondown-mermaid-source {
            background: #1f2937;
        }
    }
</style>
