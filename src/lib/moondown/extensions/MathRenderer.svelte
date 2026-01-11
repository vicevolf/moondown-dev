<script lang="ts">
    import { mathLoader } from "./mathLoader";

    interface Props {
        value: string;
        displayMode?: boolean;
    }

    let { value, displayMode = false }: Props = $props();

    let html = $state("");
    let error: string | null = $state(null);

    $effect(() => {
        const katex = mathLoader.getKatex();
        if (!katex) {
            // 理论上进入这里时应该已经加载完成了，但做个兜底
            html = value;
            return;
        }

        try {
            html = katex.renderToString(value, {
                displayMode,
                throwOnError: false, // 允许渲染即使有错误（katex 会显示错误提示）
                output: "html", // 只要 HTML，不需要 MathML (兼容性更好控制)
                strict: false,
            });
            error = null;
        } catch (e) {
            console.error("[🌚 Loader] KaTeX 渲染错误:", e);
            error = (e as Error).message;
            html = value;
        }
    });
</script>

{#if error}
    <span class="text-red-500 font-mono text-xs" title={error}>{value}</span>
{:else}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html html}
{/if}
