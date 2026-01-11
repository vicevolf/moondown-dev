<script lang="ts">
	import { saveApiKey } from "$lib/indexeddb";

	let { onKeySet }: { onKeySet: (key: string) => void } = $props();

	let apiKey = $state("");
	let showKey = $state(false);
	let error = $state("");
	let loading = $state(false);

	async function handleSubmit() {
		error = "";

		if (!apiKey.trim()) {
			error = "请输入 API 密钥";
			return;
		}

		if (!apiKey.startsWith("sk-or-v1-")) {
			error = "密钥格式不正确,应以 sk-or-v1- 开头";
			return;
		}

		loading = true;

		try {
			// Test the API key by making a simple request
			const testResponse = await fetch(
				"https://openrouter.ai/api/v1/models",
				{
					headers: {
						Authorization: `Bearer ${apiKey}`,
					},
				},
			);

			if (!testResponse.ok) {
				if (testResponse.status === 401) {
					error = "API 密钥无效，请检查密钥是否正确";
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
			if (errorMessage?.includes("fetch")) {
				error = "网络连接失败，请检查网络";
			} else {
				error = "保存密钥失败: " + errorMessage;
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200 px-4">
	<div class="card w-full max-w-md bg-base-100 shadow-xl">
		<div class="card-body">
			<div class="text-center pb-2">
				<div
					class="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-md"
				>
					<span class="text-2xl">✨</span>
				</div>
				<h2 class="card-title justify-center text-2xl">AI 聊天</h2>
				<p class="text-base-content/60">OpenRouter 驱动</p>
			</div>

			<div class="alert alert-info text-sm mb-6">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					class="stroke-current shrink-0 w-6 h-6"
					><path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path></svg
				>
				<div>
					<h3 class="font-bold">需要 API 密钥</h3>
					<div class="text-xs">
						密钥将安全地存储在您的浏览器本地，不经过中间服务器。
					</div>
					<a
						href="https://openrouter.ai/keys"
						target="_blank"
						rel="noopener noreferrer"
						class="link link-primary font-bold text-xs"
					>
						获取 OpenRouter API 密钥 →
					</a>
				</div>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="form-control gap-4"
			>
				<div>
					<label for="apiKey" class="label">
						<span class="label-text">API 密钥</span>
					</label>
					<div class="join w-full">
						<input
							id="apiKey"
							type={showKey ? "text" : "password"}
							bind:value={apiKey}
							placeholder="sk-or-v1-..."
							disabled={loading}
							class="input input-bordered join-item w-full"
						/>
						<button
							type="button"
							onclick={() => (showKey = !showKey)}
							class="btn join-item"
						>
							{showKey ? "隐藏" : "显示"}
						</button>
					</div>
				</div>

				{#if error}
					<div class="alert alert-error text-sm py-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="stroke-current shrink-0 h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
						<span>{error}</span>
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading || !apiKey.trim()}
					class="btn btn-primary w-full"
				>
					{loading ? "✨ 验证中..." : "开始使用 →"}
				</button>
			</form>

			<div class="divider"></div>

			<div class="text-xs text-center text-base-content/50">
				🔒 点击开始即表示您同意我们的隐私政策
			</div>
		</div>
	</div>
</div>
