<script lang="ts">
	import { saveApiKey } from '$lib/indexeddb';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';

	let { onKeySet }: { onKeySet: (key: string) => void } = $props();

	let apiKey = $state('');
	let showKey = $state(false);
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit() {
		error = '';
		
		if (!apiKey.trim()) {
			error = '请输入 API 密钥';
			return;
		}

		if (!apiKey.startsWith('sk-or-v1-')) {
			error = '密钥格式不正确,应以 sk-or-v1- 开头';
			return;
		}

		loading = true;
		
		try {
			// Test the API key by making a simple request
			const testResponse = await fetch('https://openrouter.ai/api/v1/models', {
				headers: {
					'Authorization': `Bearer ${apiKey}`
				}
			});

			if (!testResponse.ok) {
				if (testResponse.status === 401) {
					error = 'API 密钥无效，请检查密钥是否正确';
				} else {
					error = `验证失败 (${testResponse.status})`;
				}
				return;
			}

			// Save the key if validation passed
			await saveApiKey(apiKey);
			onKeySet(apiKey);
		} catch (e: unknown) {
			const errorMessage = e instanceof Error ? e.message : String(e);
			if (errorMessage?.includes('fetch')) {
				error = '网络连接失败，请检查网络';
			} else {
				error = '保存密钥失败: ' + errorMessage;
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
	<Card class="max-w-md w-full shadow-lg border-slate-200">
		<CardHeader class="text-center pb-2">
			<div class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-md">
				<span class="text-2xl">✨</span>
			</div>
			<CardTitle class="text-2xl text-slate-800">AI 聊天</CardTitle>
			<CardDescription class="text-slate-500">OpenRouter 驱动</CardDescription>
		</CardHeader>
		<CardContent>

		<div class="mb-6 p-4 bg-slate-50 rounded-xl text-sm text-slate-600 border border-slate-100">
			<p class="font-semibold mb-2 text-slate-700">🔑 需要 API 密钥</p>
			<p class="mb-2">请输入您的 OpenRouter API 密钥开始使用。</p>
			<p class="mb-3">密钥将安全地存储在您的浏览器本地，不会上传到任何服务器。</p>
			<a 
				href="https://openrouter.ai/keys" 
				target="_blank" 
				rel="noopener noreferrer"
				class="inline-flex items-center text-slate-700 hover:text-slate-900 font-medium transition-colors"
			>
				获取 OpenRouter API 密钥 <span class="ml-1">→</span>
			</a>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
			<div class="space-y-2">
				<label for="apiKey" class="block text-sm font-medium text-gray-700">
					API 密钥
				</label>
				<div class="relative">
					<Input
						id="apiKey"
						type={showKey ? 'text' : 'password'}
						bind:value={apiKey}
						placeholder="sk-or-v1-..."
						disabled={loading}
						class="pr-20"
					/>
					<Button
						type="button"
						onclick={() => showKey = !showKey}
						variant="ghost"
						size="sm"
						class="absolute right-1 top-1/2 -translate-y-1/2 h-8"
					>
						{showKey ? '隐藏' : '显示'}
					</Button>
				</div>
			</div>

			{#if error}
				<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
					{error}
				</div>
			{/if}

			<Button
				type="submit"
				disabled={loading || !apiKey.trim()}
				class="w-full bg-slate-800 hover:bg-slate-900 transition-all"
			>
				{loading ? '✨ 验证中...' : '开始使用 →'}
			</Button>
		</form>

		</CardContent>
		<CardFooter class="flex-col pt-2">
			<div class="w-full p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
				<p class="font-semibold mb-1 text-slate-600">🔒 隐私说明</p>
				<p>您的密钥仅存储在浏览器的 IndexedDB 中，通过 HTTPS 直接发送到 OpenRouter API，不经过任何中间服务器。</p>
			</div>
		</CardFooter>
	</Card>
</div>
