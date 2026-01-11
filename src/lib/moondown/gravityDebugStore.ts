/**
 * MoonGravity 全局调试状态存储
 * 使用 Svelte store 实现响应式更新
 */
import { writable } from "svelte/store";

export interface GravityDebugState {
    bufferSize: number;
    velocity: number;
    revealIndex: number;
    fullContentLength: number;
    isComplete: boolean;
    instanceId: string;
}

// 使用 Svelte writable store 实现响应式
export const debugState = writable<GravityDebugState | null>(null);

export function updateDebugState(state: GravityDebugState): void {
    debugState.set(state);
}

export function clearDebugState(instanceId: string): void {
    debugState.update((current) => {
        if (current?.instanceId === instanceId) {
            return null;
        }
        return current;
    });
}
