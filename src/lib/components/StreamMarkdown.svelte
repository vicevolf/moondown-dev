<script lang="ts">
	import { micromark } from 'micromark';
	import { fromMarkdown } from 'mdast-util-from-markdown';

	let { content, id }: { content: string; id: string } = $props();

	// 使用AST解析器获取精确的块边界
	function splitBlocks(md: string): string[] {
		if (!md) return [];
		
		try {
			const tree = fromMarkdown(md);
			return tree.children.map(node => {
				if (node.position) {
					const start = node.position.start.offset ?? 0;
					const end = node.position.end.offset ?? md.length;
					return md.slice(start, end);
				}
				return '';
			}).filter(Boolean);
		} catch {
			// 解析失败时返回整个内容作为单块
			return [md];
		}
	}

	// 缓存已渲染的块
	let cache = $state<Map<string, string>>(new Map());
	
	// 当内容变化时，计算块和HTML
	const blocks = $derived(splitBlocks(content));
	
	// 调试模式
	const DEBUG = true;
	
	const renderedBlocks = $derived.by(() => {
		const result: { key: string; html: string }[] = [];
		const debugInfo: string[] = [];
		
		for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i];
			const isLast = i === blocks.length - 1;
			const cacheKey = `${id}-${i}-${block}`;
			
			// 最后一个块总是重新渲染（可能不完整）
			// 之前的块使用缓存
			if (!isLast && cache.has(cacheKey)) {
				result.push({ key: `${id}-${i}`, html: cache.get(cacheKey)! });
				debugInfo.push(`[${i}] ✓ cached`);
			} else {
				const html = micromark(block);
				if (!isLast) {
					cache.set(cacheKey, html);
					debugInfo.push(`[${i}] → parsed & cached`);
				} else {
					debugInfo.push(`[${i}] ⟳ streaming (last)`);
				}
				result.push({ key: `${id}-${i}`, html });
			}
		}
		
		if (DEBUG && blocks.length > 0) {
			console.log(`%c[MD ${id.slice(0,6)}] ${debugInfo.join(' | ')}`, 'color: #888');
		}
		
		return result;
	});
</script>

<div class="markdown-content">
	{#each renderedBlocks as block (block.key)}
		{@html block.html}
	{/each}
</div>

<style>
	.markdown-content :global(h1) {
		font-size: 1.5em;
		font-weight: 700;
		margin: 0.5em 0;
	}
	.markdown-content :global(h2) {
		font-size: 1.25em;
		font-weight: 600;
		margin: 0.5em 0;
	}
	.markdown-content :global(h3) {
		font-size: 1.1em;
		font-weight: 600;
		margin: 0.4em 0;
	}
	.markdown-content :global(p) {
		margin: 0.4em 0;
	}
	.markdown-content :global(ul),
	.markdown-content :global(ol) {
		margin: 0.4em 0;
		padding-left: 1.5em;
	}
	.markdown-content :global(li) {
		margin: 0.2em 0;
	}
	.markdown-content :global(code) {
		background: rgba(0, 0, 0, 0.1);
		padding: 0.1em 0.3em;
		border-radius: 3px;
		font-size: 0.9em;
	}
	.markdown-content :global(pre) {
		background: rgba(0, 0, 0, 0.05);
		padding: 0.8em;
		border-radius: 6px;
		overflow-x: auto;
		margin: 0.5em 0;
	}
	.markdown-content :global(pre code) {
		background: none;
		padding: 0;
	}
	.markdown-content :global(blockquote) {
		border-left: 3px solid rgba(0, 0, 0, 0.2);
		margin: 0.5em 0;
		padding-left: 1em;
		color: rgba(0, 0, 0, 0.7);
	}
	.markdown-content :global(a) {
		color: #2563eb;
		text-decoration: underline;
	}
	.markdown-content :global(hr) {
		border: none;
		border-top: 1px solid rgba(0, 0, 0, 0.1);
		margin: 1em 0;
	}
</style>
