<script lang="ts">
	import type { UIMessage } from "ai";
	import BufferedText from "./BufferedText.svelte";
	import BufferedTextMoondown from "$lib/moondown/BufferedTextMoondown.svelte";
	import { useMoondown } from "$lib/stores";

	let {
		message,
		isStreaming = false,
	}: { message: UIMessage; isStreaming?: boolean } = $props();
	function getMessageText(msg: UIMessage): string {
		return msg.parts
			.filter((p) => p.type === "text")
			.map((p) => p.text)
			.join("");
	}

	const isUser = $derived(message.role === "user");
	const displayText = $derived(getMessageText(message));
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'}">
	<div
		class="max-w-[80%] {isUser
			? 'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
			: 'bg-white text-slate-800 border border-slate-200'} rounded-2xl px-4 py-3 shadow-sm"
	>
		<div
			class="text-xs {isUser
				? 'text-slate-300'
				: 'text-slate-400'} mb-1.5 font-medium"
		>
			{isUser ? "👤 你" : "✨ AI"}
		</div>

		<div class="break-words leading-relaxed">
			{#if isUser}
				<span class="whitespace-pre-wrap">{displayText}</span>
			{:else if $useMoondown}
				<BufferedTextMoondown
					content={displayText}
					id={message.id}
					{isStreaming}
				/>
			{:else}
				<BufferedText
					content={displayText}
					id={message.id}
					{isStreaming}
				/>
			{/if}
		</div>
	</div>
</div>
