<script lang="ts">
	import { micromark } from 'micromark';
	import { fromMarkdown } from 'mdast-util-from-markdown';

	let { content, id }: { content: string; id: string } = $props();

	// 渲染结果
	let renderedBlocks = $state<{ key: string; html: string }[]>([]);
	
	// 增量解析缓存（不触发响应式）
	let cache = {
		lastContent: '',
		lastBlockStart: 0,
		stableBlocks: [] as { key: string; html: string }[],  // 已稳定块（含 key）
		lastBlockContent: '',  // 最后块原始内容（用于跳过重复解析）
		lastBlockHtml: ''      // 最后块渲染结果
	};
	
	const DEBUG = true;
	
	// 节流控制（真节流，不是防抖）
	let parseTimer: ReturnType<typeof setTimeout> | null = null;
	let pendingContent: string | null = null;
	const PARSE_THROTTLE_MS = 40; // 40ms 节流，降低解析频率
	
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
	
	// 渲染块并生成稳定 key（使用 globalStart 保证唯一性）
	function renderBlock(block: { globalStart: number; content: string }): { key: string; html: string } {
		return {
			key: `${id}-${block.globalStart}`,
			html: micromark(block.content)
		};
	}
	
	// 全量解析
	function fullParse(md: string) {
		try {
			const tree = fromMarkdown(md);
			const blocks = extractBlocks(tree, md, 0);
			
			if (blocks.length === 0) {
				const html = micromark(md);
				cache = {
					lastContent: md,
					lastBlockStart: 0,
					stableBlocks: [],
					lastBlockContent: md,
					lastBlockHtml: html
				};
				renderedBlocks = [{ key: `${id}-0`, html }];
				return;
			}
			
			const lastBlock = blocks[blocks.length - 1];
			const stableBlocks = blocks.slice(0, -1).map(renderBlock);
			const lastHtml = micromark(lastBlock.content);
			
			cache = {
				lastContent: md,
				lastBlockStart: lastBlock.globalStart,
				stableBlocks,
				lastBlockContent: lastBlock.content,
				lastBlockHtml: lastHtml
			};
			
			if (DEBUG) console.log(`%c[MD ${id.slice(0,6)}] full: ${blocks.length} blocks`, 'color: #e67e22');
			
			renderedBlocks = [...stableBlocks, { key: `${id}-${lastBlock.globalStart}`, html: lastHtml }];
		} catch {
			const html = micromark(md);
			renderedBlocks = [{ key: `${id}-0`, html }];
		}
	}
	
	// 增量解析
	function incrementalParse(md: string) {
		const tailContent = md.slice(cache.lastBlockStart);
		
		try {
			const tree = fromMarkdown(tailContent);
			const tailBlocks = extractBlocks(tree, tailContent, cache.lastBlockStart);
			
			if (tailBlocks.length === 0) {
				// 无块，直接渲染 tail
				if (tailContent !== cache.lastBlockContent) {
					cache.lastBlockContent = tailContent;
					cache.lastBlockHtml = micromark(tailContent);
				}
				cache.lastContent = md;
				renderedBlocks = [...cache.stableBlocks, { key: `${id}-${cache.lastBlockStart}`, html: cache.lastBlockHtml }];
				return;
			}
			
			// 有新稳定块产生
			if (tailBlocks.length > 1) {
				const newStable = tailBlocks.slice(0, -1).map(renderBlock);
				cache.stableBlocks = [...cache.stableBlocks, ...newStable];
				if (DEBUG) console.log(`%c[MD ${id.slice(0,6)}] +${newStable.length} stable`, 'color: #27ae60');
			}
			
			const lastBlock = tailBlocks[tailBlocks.length - 1];
			
			// 最后块内容变化才重新渲染
			if (lastBlock.content !== cache.lastBlockContent) {
				cache.lastBlockContent = lastBlock.content;
				cache.lastBlockHtml = micromark(lastBlock.content);
			}
			
			cache.lastBlockStart = lastBlock.globalStart;
			cache.lastContent = md;
			
			renderedBlocks = [...cache.stableBlocks, { key: `${id}-${lastBlock.globalStart}`, html: cache.lastBlockHtml }];
		} catch {
			fullParse(md);
		}
	}
	
	$effect(() => {
		const md = content;
		
		if (!md) {
			if (parseTimer) {
				clearTimeout(parseTimer);
				parseTimer = null;
			}
			pendingContent = null;
			renderedBlocks = [];
			cache = { lastContent: '', lastBlockStart: 0, stableBlocks: [], lastBlockContent: '', lastBlockHtml: '' };
			return;
		}
		
		if (md === cache.lastContent) return;
		
		// 真节流：如果有定时器在运行，只保存内容，等定时器触发
		if (parseTimer !== null) {
			pendingContent = md;
			return;
		}
		
		// 立即执行第一次解析
		const isAppend = md.startsWith(cache.lastContent) && cache.lastContent.length > 0;
		if (isAppend) {
			incrementalParse(md);
		} else {
			fullParse(md);
		}
		
		// 设置节流定时器
		parseTimer = setTimeout(() => {
			parseTimer = null;
			
			// 如果有待处理的内容，执行解析
			if (pendingContent !== null && pendingContent !== cache.lastContent) {
				const pendingMd = pendingContent;
				pendingContent = null;
				
				const isAppend = pendingMd.startsWith(cache.lastContent) && cache.lastContent.length > 0;
				if (isAppend) {
					incrementalParse(pendingMd);
				} else {
					fullParse(pendingMd);
				}
			}
		}, PARSE_THROTTLE_MS);
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
