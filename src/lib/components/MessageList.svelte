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

	// 用户暂停状态
	let userPaused = $state(false);

	/** 判断是否接近底部 */
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

	/** 用户用鼠标滚轮滚动 */
	function handleWheel(e: WheelEvent) {
		if (e.deltaY < 0) {
			// 向上滚动，暂停
			userPaused = true;
		} else if (e.deltaY > 0 && isNearBottom()) {
			// 向下滚动且接近底部，恢复
			userPaused = false;
		}
	}

	/** 用户触摸滚动开始 */
	let touchStartY = 0;
	function handleTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchMove(e: TouchEvent) {
		const touchY = e.touches[0].clientY;
		const deltaY = touchStartY - touchY; // 正值 = 向上滑动手指 = 内容向下滚动

		if (deltaY < -10) {
			// 向上滚动内容（手指向下滑），暂停
			userPaused = true;
		} else if (deltaY > 10 && isNearBottom()) {
			// 向下滚动内容（手指向上滑）且接近底部，恢复
			userPaused = false;
		}
		touchStartY = touchY;
	}

	/**
	 * 滚动到底部（带时间节流）
	 */
	function scrollToBottom() {
		if (!container || userPaused) return;
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
	onwheel={handleWheel}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
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
