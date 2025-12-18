<script lang="ts">
	import type { UIMessage } from 'ai';
	import MessageBubble from './MessageBubble.svelte';

	let { messages, isStreaming = false }: { messages: UIMessage[]; isStreaming?: boolean } = $props();
	let container: HTMLDivElement;

	// Auto scroll to bottom when new messages arrive
	$effect(() => {
		if (messages && container) {
			container.scrollTop = container.scrollHeight;
		}
	});

	// 最后一条 assistant 消息的 index
	const lastAssistantIndex = $derived(
		messages.reduceRight((found, msg, i) => found === -1 && msg.role === 'assistant' ? i : found, -1)
	);
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
		<MessageBubble {message} isStreaming={isStreaming && i === lastAssistantIndex} />
	{/each}
</div>

<style>
	/* Markdown 基础样式 */
	:global(.markdown-body) {
		line-height: 1.6;
	}
	:global(.markdown-body p) {
		margin: 0.5em 0;
	}
	:global(.markdown-body p:first-child) {
		margin-top: 0;
	}
	:global(.markdown-body p:last-child) {
		margin-bottom: 0;
	}
	:global(.markdown-body code) {
		background: rgba(0,0,0,0.05);
		padding: 0.2em 0.4em;
		border-radius: 4px;
		font-size: 0.9em;
	}
	:global(.markdown-body pre) {
		background: #1e293b;
		color: #e2e8f0;
		padding: 1em;
		border-radius: 8px;
		overflow-x: auto;
		margin: 0.5em 0;
	}
	:global(.markdown-body pre code) {
		background: transparent;
		padding: 0;
		color: inherit;
	}
	:global(.markdown-body ul, .markdown-body ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}
	:global(.markdown-body blockquote) {
		border-left: 3px solid #cbd5e1;
		padding-left: 1em;
		margin: 0.5em 0;
		color: #64748b;
	}
	:global(.markdown-body h1, .markdown-body h2, .markdown-body h3) {
		margin: 0.75em 0 0.5em;
		font-weight: 600;
	}
	:global(.markdown-body h1) { font-size: 1.5em; }
	:global(.markdown-body h2) { font-size: 1.25em; }
	:global(.markdown-body h3) { font-size: 1.1em; }
	:global(.markdown-body a) {
		color: #3b82f6;
		text-decoration: underline;
	}
	:global(.markdown-body hr) {
		border: none;
		border-top: 1px solid #e2e8f0;
		margin: 1em 0;
	}
	/* 表格样式 */
	:global(.markdown-body table) {
		border-collapse: collapse;
		width: 100%;
		margin: 0.5em 0;
		font-size: 0.9em;
	}
	:global(.markdown-body th, .markdown-body td) {
		border: 1px solid #e2e8f0;
		padding: 0.5em 0.75em;
		text-align: left;
	}
	:global(.markdown-body th) {
		background: #f8fafc;
		font-weight: 600;
	}
	:global(.markdown-body tr:nth-child(even)) {
		background: #f8fafc;
	}
</style>
