<script lang="ts">
    import type { Content, Parent } from "mdast";
    import type { RangeInfo, RangedNode } from "./engine";

    interface Props {
        node: Content;
        blockRange?: RangeInfo;
        revealIndex?: number;
    }

    let {
        node,
        blockRange = undefined,
        revealIndex = Infinity,
    }: Props = $props();

    /**
     * 获取节点的字符范围
     */
    function getRange(n: Content): RangeInfo | undefined {
        return (n as RangedNode).__range;
    }

    /**
     * 计算节点可见性
     * @returns 'full' | 'partial' | 'hidden'
     */
    function getVisibility(n: Content): "full" | "partial" | "hidden" {
        const range = getRange(n);
        if (!range || revealIndex === Infinity) return "full";
        if (revealIndex >= range.charEnd) return "full";
        if (revealIndex <= range.charStart) return "hidden";
        return "partial";
    }

    /**
     * 裁切文本值
     */
    function clipText(value: string, nodeRange: RangeInfo): string {
        if (revealIndex === Infinity) return value;
        if (revealIndex >= nodeRange.charEnd) return value;
        if (revealIndex <= nodeRange.charStart) return "";

        const visibleChars = revealIndex - nodeRange.charStart;
        return value.slice(0, visibleChars);
    }
</script>

{#snippet renderNode(n: Content)}
    {@const visibility = getVisibility(n)}
    {@const range = getRange(n)}

    {#if visibility === "hidden"}
        <!-- 完全隐藏 -->
    {:else if n.type === "heading"}
        {@const Tag = `h${n.depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"}
        <svelte:element this={Tag} class="moondown-heading">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </svelte:element>
    {:else if n.type === "paragraph"}
        <p class="moondown-paragraph">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </p>
    {:else if n.type === "text"}
        {#if visibility === "full"}
            {n.value}
        {:else if range}
            {clipText(n.value, range)}
        {/if}
    {:else if n.type === "code"}
        <div class="moondown-code">
            {#if n.lang}
                <div class="moondown-code-lang">
                    {n.lang}
                </div>
            {/if}
            <pre><code
                    >{#if visibility === "full"}{n.value}{:else if range}{clipText(
                            n.value,
                            range,
                        )}{/if}</code
                ></pre>
        </div>
    {:else if n.type === "list"}
        {#if n.ordered}
            <ol class="moondown-list ordered">
                {#each (n as Parent).children as child}
                    {@render renderNode(child)}
                {/each}
            </ol>
        {:else}
            <ul class="moondown-list unordered">
                {#each (n as Parent).children as child}
                    {@render renderNode(child)}
                {/each}
            </ul>
        {/if}
    {:else if n.type === "listItem"}
        <li class="moondown-list-item">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </li>
    {:else if n.type === "blockquote"}
        <blockquote class="moondown-blockquote">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </blockquote>
    {:else if n.type === "thematicBreak"}
        <hr class="moondown-hr" />
    {:else if n.type === "link"}
        <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            class="moondown-link"
        >
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </a>
    {:else if n.type === "strong"}
        <strong class="moondown-strong">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </strong>
    {:else if n.type === "emphasis"}
        <em class="moondown-emphasis">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </em>
    {:else if n.type === "delete"}
        <del class="moondown-delete">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </del>
    {:else if n.type === "inlineCode"}
        <code class="moondown-inline-code"
            >{#if visibility === "full"}{n.value}{:else if range}{clipText(
                    n.value,
                    range,
                )}{/if}</code
        >
    {:else if n.type === "image"}
        <img src={n.url} alt={n.alt || ""} class="moondown-image" />
    {:else if n.type === "table"}
        <!--
            ⚠️ 表格结构说明 (流式渲染妥协)
            - 只有第一个数据行被 <tbody> 显式包裹
            - 后续行直接渲染为裸露的 <tr>
            - 这是流式渲染场景下的有意设计：行数动态增长，无法预知结束点
            - 浏览器会自动为裸露的 <tr> 创建隐式 <tbody>，功能不受影响
        -->
        <div class="moondown-table-wrapper">
            <table class="moondown-table">
                {#each (n as Parent).children as child, i}
                    {#if i === 0}
                        <thead>
                            {@render renderNode(child)}
                        </thead>
                    {:else if i === 1}
                        <tbody>
                            {@render renderNode(child)}
                        </tbody>
                    {:else}
                        {@render renderNode(child)}
                    {/if}
                {/each}
            </table>
        </div>
    {:else if n.type === "tableRow"}
        <tr>
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </tr>
    {:else if n.type === "tableCell"}
        <td>
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </td>
    {:else}
        <!-- 兜底渲染 -->
        {#if "value" in n}
            {@const v = n.value as string}
            {#if visibility === "full"}
                {v}
            {:else if range}
                {clipText(v, range)}
            {/if}
        {/if}
        {#if "children" in n}
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        {/if}
    {/if}
{/snippet}

{@render renderNode(node)}
