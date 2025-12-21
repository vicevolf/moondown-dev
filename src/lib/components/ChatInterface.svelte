<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport } from 'ai';
	import MessageList from './MessageList.svelte';
	import MessageInput from './MessageInput.svelte';
	import { deleteApiKey } from '$lib/indexeddb';
	import { Button } from '$lib/components/ui/button';

	let { apiKey, onKeyDeleted }: { apiKey: string; onKeyDeleted: () => void } = $props();

	const MODEL = 'xiaomi/mimo-v2-flash:free';

	const chat = new Chat({
		transport: new DefaultChatTransport({
			api: '/api/chat',
			body: () => ({ apiKey })
		})
	});

	function handleSendMessage(text: string) {
		chat.sendMessage({ text });
	}

	async function handleDeleteKey() {
		if (confirm('确定要删除 API 密钥吗?删除后需要重新输入。')) {
			await deleteApiKey();
			onKeyDeleted();
		}
	}

	let canSend = $derived(chat.status === 'ready');
	let errorMessage = $derived(chat.error ? '发送消息失败，请重试' : '');
</script>

<div class="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
	<!-- Header -->
	<div class="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center shadow-md">
				<span class="text-white text-lg">✨</span>
			</div>
			<div>
				<h1 class="text-lg font-semibold text-slate-800">AI 聊天</h1>
				<p class="text-xs text-slate-500">{MODEL}</p>
			</div>
		</div>
		<Button
			onclick={handleDeleteKey}
			variant="ghost"
			size="sm"
			class="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
		>
			<span class="mr-1">🗑️</span>删除密钥
		</Button>
	</div>

	<!-- Error banner -->
	{#if errorMessage}
		<div class="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2 shadow-sm">
			<span class="text-red-500 mt-0.5">⚠️</span>
			<div class="flex-1">{errorMessage}</div>
		</div>
	{/if}

	<!-- Messages -->
	<MessageList messages={chat.messages} isStreaming={chat.status === 'streaming'} />

	<!-- Input -->
	<MessageInput onSend={handleSendMessage} disabled={!canSend} />
</div>
