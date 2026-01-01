import { writable } from 'svelte/store';

// AB 测试开关：true = Moondown, false = StreamMarkdown
export const useMoondown = writable(true);
