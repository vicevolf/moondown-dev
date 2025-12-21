<script lang="ts">
	import { micromark } from 'micromark';
	import { fromMarkdown } from 'mdast-util-from-markdown';

	let { content, id }: { content: string; id: string } = $props();

	// 渲染结果
	let renderedBlocks = $state<{ key: string; html: string }[]>([]);
	
	// 增量解析缓存（不触发响应式）
	let cache = {
		lastContent: '',
		lastBlockStart: 0,     // 最后一个块在原文中的起始位置
		stableHtmls: [] as string[]  // 已稳定块的 HTML
	};
	
	const DEBUG = true;
	
	// 从 AST 提取块信息
	function extractBlocks(tree: ReturnType<typeof fromMarkdown>, source: string, baseOffset: number) {
		return tree.children.map(node => {
			if (node.position) {
				const localStart = node.position.start.offset ?? 0;
				const localEnd = node.position.end.offset ?? source.length;
				return {
					globalStart: baseOffset + localStart,
					content: source.slice(localStart, localEnd)
				};
			}
			return null;
		}).filter(Boolean) as { globalStart: number; content: string }[];
	}
	
	// 全量解析
	function fullParse(md: string): string[] {
		try {
			const tree = fromMarkdown(md);
			const blocks = extractBlocks(tree, md, 0);
			
			if (blocks.length === 0) {
				cache = { lastContent: md, lastBlockStart: 0, stableHtmls: [] };
				return [micromark(md)];
			}
			
			// 缓存除最后一个块外的所有块
			const stableHtmls = blocks.slice(0, -1).map(b => micromark(b.content));
			const lastBlock = blocks[blocks.length - 1];
			
			cache = {
				lastContent: md,
				lastBlockStart: lastBlock.globalStart,
				stableHtmls
			};
			
			if (DEBUG) console.log(`%c[MD ${id.slice(0,6)}] full parse: ${blocks.length} blocks`, 'color: #e67e22');
			
			return [...stableHtmls, micromark(lastBlock.content)];
		} catch {
			return [micromark(md)];
		}
	}
	
	// 增量解析
	function incrementalParse(md: string): string[] {
		// 只解析从最后一个块开始的内容
		const tailContent = md.slice(cache.lastBlockStart);
		
		try {
			const tree = fromMarkdown(tailContent);
			const tailBlocks = extractBlocks(tree, tailContent, cache.lastBlockStart);
			
			if (tailBlocks.length === 0) {
				// 没有解析出块，用原始内容渲染
				return [...cache.stableHtmls, micromark(tailContent)];
			}
			
			if (tailBlocks.length > 1) {
				// 有新的完整块产生，更新缓存
				const newStableBlocks = tailBlocks.slice(0, -1);
				cache.stableHtmls = [
					...cache.stableHtmls,
					...newStableBlocks.map(b => micromark(b.content))
				];
				
				if (DEBUG) console.log(`%c[MD ${id.slice(0,6)}] +${newStableBlocks.length} stable`, 'color: #27ae60');
			}
			
			const lastBlock = tailBlocks[tailBlocks.length - 1];
			cache.lastBlockStart = lastBlock.globalStart;
			cache.lastContent = md;
			
			return [...cache.stableHtmls, micromark(lastBlock.content)];
		} catch {
			// 解析失败，回退到全量
			return fullParse(md);
		}
	}
	
	$effect(() => {
		const md = content;
		
		if (!md) {
			renderedBlocks = [];
			cache = { lastContent: '', lastBlockStart: 0, stableHtmls: [] };
			return;
		}
		
		// 内容没变，跳过
		if (md === cache.lastContent) {
			return;
		}
		
		// 判断是否可以增量解析
		const isAppend = md.startsWith(cache.lastContent) && cache.lastContent.length > 0;
		
		const htmls = isAppend ? incrementalParse(md) : fullParse(md);
		
		renderedBlocks = htmls.map((html, i) => ({
			key: `${id}-${i}`,
			html
		}));
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
