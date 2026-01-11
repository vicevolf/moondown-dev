<script lang="ts">
	import type { UIMessage } from "ai";
	import MessageBubble from "./MessageBubble.svelte";

	let {
		messages,
		isStreaming = false,
	}: { messages: UIMessage[]; isStreaming?: boolean } = $props();
	let container: HTMLDivElement;

	// 节流控制：300ms 时间节流
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
	const SCROLL_THROTTLE_MS = 300;

	// 用户滚动状态：向上滚动时暂停自动吸底
	let userScrolledUp = $state(false);

	/** 判断是否接近底部（50px 阈值） */
	function isNearBottom(): boolean {
		if (!container) return true;
		const threshold = 50;
		return (
			container.scrollHeight -
				container.scrollTop -
				container.clientHeight <
			threshold
		);
	}

	/** 处理用户滚动事件 */
	function handleScroll() {
		userScrolledUp = !isNearBottom();
	}

	/**
	 * 滚动到底部（带时间节流）
	 * 由 MoonGravity 的内容更新回调触发
	 */
	function scrollToBottom() {
		if (!container || userScrolledUp) return;
		if (scrollTimeout === null) {
			scrollTimeout = setTimeout(() => {
				container.scrollTop = container.scrollHeight;
				scrollTimeout = null;
			}, SCROLL_THROTTLE_MS);
		}
	}

	// Auto scroll to bottom when new messages arrive
	$effect(() => {
		if (messages && container) {
			scrollToBottom();
		}
	});
</script>

<div
	bind:this={container}
	onscroll={handleScroll}
	class="flex-1 overflow-y-auto px-4 py-6 space-y-4"
>
	{#if messages.length === 0}
		<div class="text-center text-slate-400 mt-16">
			<div
				class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center"
			>
				<span class="text-3xl">💬</span>
			</div>
			<p class="text-lg font-medium text-slate-600">开始对话吧!</p>
			<p class="text-sm mt-2">输入您的问题，AI 将为您解答</p>
		</div>
	{/if}

	{#each messages as message, i (message.id)}
		{@const isLastStreaming = isStreaming && i === messages.length - 1}
		<MessageBubble
			{message}
			isStreaming={isLastStreaming}
			onContentUpdate={isLastStreaming ? scrollToBottom : undefined}
		/>
	{/each}
</div>
