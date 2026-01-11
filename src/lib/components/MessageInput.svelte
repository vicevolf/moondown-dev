<script lang="ts">
	let {
		onSend,
		disabled = false,
	}: { onSend: (text: string) => void; disabled?: boolean } = $props();

	let input = $state("");

	function handleSubmit() {
		const text = input.trim();
		if (text && !disabled) {
			onSend(text);
			input = "";
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		// Enter to send, Shift+Enter for new line
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}
</script>

<div class="border-t border-base-300 bg-base-100/80 backdrop-blur-sm px-4 py-4">
	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="flex gap-3 items-end"
	>
		<div class="flex-1 relative">
			<textarea
				bind:value={input}
				onkeydown={handleKeydown}
				placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
				rows="1"
				{disabled}
				class="textarea textarea-bordered w-full resize-none px-4 py-3 focus:outline-none transition-all placeholder:text-base-content/40"
			></textarea>
		</div>
		<button
			type="submit"
			disabled={disabled || !input.trim()}
			class="btn btn-neutral h-auto py-3 min-h-[3rem]"
		>
			{disabled ? "✨ 生成中..." : "发送 →"}
		</button>
	</form>
</div>
