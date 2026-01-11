<script lang="ts">
	import { Chat } from "@ai-sdk/svelte";
	import { DefaultChatTransport } from "ai";
	import MessageList from "./MessageList.svelte";
	import MessageInput from "./MessageInput.svelte";
	import { deleteApiKey } from "$lib/indexeddb";
	import MoonGravityDebug from "$lib/moondown/MoonGravityDebug.svelte";

	let { apiKey, onKeyDeleted }: { apiKey: string; onKeyDeleted: () => void } =
		$props();

	const MODEL = "xiaomi/mimo-v2-flash:free";

	const chat = new Chat({
		transport: new DefaultChatTransport({
			api: "/api/chat",
			body: () => (apiKey === "env" ? {} : { apiKey }),
		}),
	});

	function handleSendMessage(text: string) {
		chat.sendMessage({ text });
	}

	async function handleDeleteKey() {
		if (confirm("确定要删除 API 密钥吗?删除后需要重新输入。")) {
			await deleteApiKey();
			onKeyDeleted();
		}
	}

	let canSend = $derived(chat.status === "ready");
	let errorMessage = $derived(chat.error ? "发送消息失败，请重试" : "");
</script>

<div class="flex flex-col h-screen bg-base-200">
	<!-- Header -->
	<div
		class="navbar bg-base-100/80 backdrop-blur-sm border-b border-base-300 px-4 min-h-[4rem]"
	>
		<div class="flex-1 gap-3">
			<div
				class="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md"
			>
				<span class="text-white text-lg">✨</span>
			</div>
			<div>
				<h1 class="text-lg font-semibold text-base-content">AI 聊天</h1>
				<p class="text-xs text-base-content/60">{MODEL}</p>
			</div>
		</div>
		<div class="flex-none">
			<button
				onclick={handleDeleteKey}
				class="btn btn-ghost btn-sm text-base-content/60 hover:text-error hover:bg-error/10"
			>
				<span class="mr-1">🗑️</span>删除密钥
			</button>
		</div>
	</div>

	<!-- Error banner -->
	{#if errorMessage}
		<div class="mx-4 mt-3 alert alert-error shadow-sm">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="stroke-current shrink-0 h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
				><path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/></svg
			>
			<span>{errorMessage}</span>
		</div>
	{/if}

	<!-- Messages -->
	<MessageList
		messages={chat.messages}
		isStreaming={chat.status === "streaming"}
	/>

	<!-- Input -->
	<MessageInput onSend={handleSendMessage} disabled={!canSend} />
</div>

<!-- 全局调试面板 (仅开发环境) -->
<MoonGravityDebug />
