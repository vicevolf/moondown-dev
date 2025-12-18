<script lang="ts">
	import type { UIMessage } from 'ai';
	import { createStreamRenderer } from '$lib/streamMarkdown.svelte';

	let { message, isStreaming = false }: { message: UIMessage; isStreaming?: boolean } = $props();

	const renderer = createStreamRenderer();
	let prevTextLength = 0;

	// 获取消息的完整文本
	function getMessageText(msg: UIMessage): string {
		return msg.parts
			.filter(p => p.type === 'text')
			.map(p => p.text)
			.join('');
	}

	// 监听消息变化，增量 push
	$effect(() => {
		if (message.role !== 'assistant') return;

		const fullText = getMessageText(message);
		
		if (fullText.length > prevTextLength) {
			// 只 push 新增的部分
			const newChunk = fullText.slice(prevTextLength);
			renderer.push(newChunk);
			prevTextLength = fullText.length;
		} else if (fullText.length === 0 && prevTextLength > 0) {
			// 消息被重置
			renderer.reset();
			prevTextLength = 0;
		}
	});

	// 监听流状态，当流结束时 finalize
	$effect(() => {
		if (message.role === 'assistant' && !isStreaming && prevTextLength > 0) {
			renderer.finalize();
		}
	});

	// 组件卸载时也 finalize（安全网）
	$effect(() => {
		return () => {
			renderer.finalize();
		};
	});

	const isUser = $derived(message.role === 'user');
	const displayText = $derived(getMessageText(message));
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'}">
	<div class="max-w-[80%] {isUser 
		? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white' 
		: 'bg-white text-slate-800 border border-slate-200'} rounded-2xl px-4 py-3 shadow-sm">
		<div class="text-xs {isUser ? 'text-slate-300' : 'text-slate-400'} mb-1.5 font-medium">
			{isUser ? '👤 你' : '✨ AI'}
		</div>
		
		{#if isUser}
			<div class="whitespace-pre-wrap break-words leading-relaxed">
				{displayText}
			</div>
		{:else}
			{#if renderer.html}
				<div class="prose prose-sm prose-slate max-w-none markdown-body">
					{@html renderer.html}
				</div>
			{:else}
				<div class="whitespace-pre-wrap break-words leading-relaxed">
					{displayText || '█'}
				</div>
			{/if}
		{/if}
	</div>
</div>
