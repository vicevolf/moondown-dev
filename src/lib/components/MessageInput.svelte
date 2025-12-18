<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	let { onSend, disabled = false }: { onSend: (text: string) => void; disabled?: boolean } = $props();

	let input = $state('');

	function handleSubmit() {
		const text = input.trim();
		if (text && !disabled) {
			onSend(text);
			input = '';
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		// Enter to send, Shift+Enter for new line
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}
</script>

<div class="border-t border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-4">
	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="flex gap-3 items-end">
		<div class="flex-1 relative">
			<textarea
				bind:value={input}
				onkeydown={handleKeydown}
				placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
				rows="1"
				disabled={disabled}
				class="w-full resize-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-transparent focus:bg-white disabled:bg-slate-100 disabled:cursor-not-allowed transition-all placeholder:text-slate-400"
			></textarea>
		</div>
		<Button
			type="submit"
			disabled={disabled || !input.trim()}
			class="px-6 py-3 bg-slate-800 hover:bg-slate-900 rounded-xl transition-all disabled:opacity-50"
		>
			{disabled ? '✨ 生成中...' : '发送 →'}
		</Button>
	</form>
</div>
