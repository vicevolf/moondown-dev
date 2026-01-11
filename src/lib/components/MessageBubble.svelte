<script lang="ts">
	import type { UIMessage } from "ai";
	import { MoonGravity } from "$lib/moondown";

	let {
		message,
		isStreaming = false,
		onContentUpdate,
	}: {
		message: UIMessage;
		isStreaming?: boolean;
		/** 内容渲染更新时的回调，用于触发吸底滚动等外部行为 */
		onContentUpdate?: () => void;
	} = $props();
	function getMessageText(msg: UIMessage): string {
		return msg.parts
			.filter((p) => p.type === "text")
			.map((p) => p.text)
			.join("");
	}

	const isUser = $derived(message.role === "user");
	const displayText = $derived(getMessageText(message));
</script>

<div class="chat {isUser ? 'chat-end' : 'chat-start'}">
	<div class="chat-header mb-1">
		<span class="text-xs opacity-50 font-medium">
			{isUser ? "👤 你" : "✨ AI"}
		</span>
	</div>

	<div
		class="chat-bubble {isUser
			? 'chat-bubble-primary'
			: 'bg-white text-base-content border border-base-200'}"
	>
		<div class="break-words min-w-0">
			{#if isUser}
				<span class="whitespace-pre-wrap">{displayText}</span>
			{:else}
				<div class="markdown-body">
					<MoonGravity
						content={displayText}
						{isStreaming}
						{onContentUpdate}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>
