<script lang="ts">
	import type { UIMessage } from 'ai';
	import MessageBubble from './MessageBubble.svelte';

	let { messages, isStreaming = false }: { messages: UIMessage[]; isStreaming?: boolean } = $props();
	let container: HTMLDivElement;

	// 节流控制：使用 RAF 避免过度滚动
	let scrollRaf: number | null = null;

	// Auto scroll to bottom when new messages arrive
	$effect(() => {
		if (messages && container) {
			if (scrollRaf === null) {
				scrollRaf = requestAnimationFrame(() => {
					container.scrollTop = container.scrollHeight;
					scrollRaf = null;
				});
			}
		}
	});
</script>

<div 
	bind:this={container}
	class="flex-1 overflow-y-auto px-4 py-6 space-y-4"
>
	{#if messages.length === 0}
		<div class="text-center text-slate-400 mt-16">
			<div class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
				<span class="text-3xl">💬</span>
			</div>
			<p class="text-lg font-medium text-slate-600">开始对话吧!</p>
			<p class="text-sm mt-2">输入您的问题，AI 将为您解答</p>
		</div>
	{/if}

	{#each messages as message, i (message.id)}
		<MessageBubble {message} isStreaming={isStreaming && i === messages.length - 1} />
	{/each}
</div>


