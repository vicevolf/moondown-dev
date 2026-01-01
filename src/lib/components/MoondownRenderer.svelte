<script lang="ts">
    import type { Content, Parent } from "mdast";

    interface Props {
        node: Content;
    }

    let { node }: Props = $props();
</script>

{#snippet renderNode(n: Content)}
    {#if n.type === "heading"}
        {@const Tag = `h${n.depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6"}
        <svelte:element
            this={Tag}
            class="moondown-heading font-bold my-4 text-gray-900 dark:text-gray-100"
        >
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </svelte:element>
    {:else if n.type === "paragraph"}
        <p
            class="moondown-paragraph mb-3 leading-relaxed text-gray-800 dark:text-gray-300 break-words"
        >
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </p>
    {:else if n.type === "code"}
        <div
            class="moondown-code my-3 rounded-lg bg-[#1e1e1e] border border-gray-700 overflow-hidden"
        >
            {#if n.lang}
                <div
                    class="px-3 py-1 bg-[#2d2d2d] text-xs text-gray-400 select-none border-b border-gray-700/50"
                >
                    {n.lang}
                </div>
            {/if}
            <pre
                class="p-4 overflow-x-auto text-sm font-mono text-gray-200 whitespace-pre-wrap"><code
                    >{n.value}</code
                ></pre>
        </div>
    {:else if n.type === "list"}
        {#if n.ordered}
            <ol class="moondown-list mb-4 pl-5 space-y-1 list-decimal">
                {#each (n as Parent).children as child}
                    {@render renderNode(child)}
                {/each}
            </ol>
        {:else}
            <ul class="moondown-list mb-4 pl-5 space-y-1 list-disc">
                {#each (n as Parent).children as child}
                    {@render renderNode(child)}
                {/each}
            </ul>
        {/if}
    {:else if n.type === "listItem"}
        <li class="moondown-list-item pl-1 marker:text-gray-500">
            {#each (n as Parent).children as child}
                <div class="my-0.5">
                    {@render renderNode(child)}
                </div>
            {/each}
        </li>
    {:else if n.type === "blockquote"}
        <blockquote
            class="moondown-blockquote border-l-4 border-gray-300 pl-4 py-1 my-4 italic text-gray-600 bg-gray-50/50 dark:bg-gray-800/30"
        >
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </blockquote>
    {:else if n.type === "thematicBreak"}
        <hr
            class="moondown-hr my-6 border-t border-gray-300 dark:border-gray-600"
        />
    {:else if n.type === "link"}
        <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            class="moondown-link text-blue-600 hover:underline break-all"
        >
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </a>
    {:else if n.type === "strong"}
        <strong class="moondown-strong font-semibold">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </strong>
    {:else if n.type === "emphasis"}
        <em class="moondown-emphasis italic">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </em>
    {:else if n.type === "delete"}
        <del class="moondown-delete line-through text-gray-500">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </del>
    {:else if n.type === "inlineCode"}
        <code
            class="moondown-inline-code px-1.5 py-0.5 mx-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono text-sm text-red-600 dark:text-red-400"
            >{n.value}</code
        >
    {:else if n.type === "image"}
        <img
            src={n.url}
            alt={n.alt || ""}
            class="moondown-image max-w-full rounded my-2"
        />
    {:else if n.type === "table"}
        <div class="moondown-table-wrapper overflow-x-auto my-4">
            <table
                class="moondown-table min-w-full border-collapse border border-gray-300 dark:border-gray-600"
            >
                {#each (n as Parent).children as child, i}
                    {#if i === 0}
                        <thead class="bg-gray-100 dark:bg-gray-800">
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
        <tr class="border-b border-gray-200 dark:border-gray-700">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </tr>
    {:else if n.type === "tableCell"}
        <td class="px-3 py-2 border border-gray-200 dark:border-gray-700">
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        </td>
    {:else}
        <!-- 兜底渲染 -->
        {#if "value" in n}
            {n.value}
        {/if}
        {#if "children" in n}
            {#each (n as Parent).children as child}
                {@render renderNode(child)}
            {/each}
        {/if}
    {/if}
{/snippet}

{@render renderNode(node)}
