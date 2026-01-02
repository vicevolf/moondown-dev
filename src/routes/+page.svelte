<script lang="ts">
	import { onMount } from 'svelte';
	import { loadApiKey } from '$lib/indexeddb';
	import KeyInput from '$lib/components/KeyInput.svelte';
	import ChatInterface from '$lib/components/ChatInterface.svelte';

	let apiKey = $state<string | null>(null);
	let loading = $state(true);
	let hasEnvKey = $state(false);

	onMount(async () => {
		try {
			// 检查服务端是否配置了环境变量
			const response = await fetch('/api/check-env-key');
			if (response.ok) {
				const data = await response.json();
				hasEnvKey = data.hasKey;
			}

			// 尝试加载本地存储的 key
			const storedKey = await loadApiKey();
			if (storedKey) {
				apiKey = storedKey;
			} else if (hasEnvKey) {
				// 如果有环境变量且没有本地 key，直接进入聊天界面
				apiKey = 'env';
			}
		} catch (err) {
			console.error('Failed to load API key:', err);
		} finally {
			loading = false;
		}
	});

	function handleKeySet(key: string) {
		apiKey = key;
	}

	function handleKeyDeleted() {
		apiKey = null;
	}
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
		<div class="text-center">
			<div class="relative">
				<div class="animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-slate-600 mx-auto mb-4"></div>
			</div>
			<p class="text-slate-500 font-medium">加载中...</p>
		</div>
	</div>
{:else if !apiKey}
	<KeyInput onKeySet={handleKeySet} />
{:else}
	<ChatInterface {apiKey} onKeyDeleted={handleKeyDeleted} />
{/if}
