import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Component } from "svelte";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Helper type for components with element ref
export type WithElementRef<T extends Record<string, any>> = T & {
	ref?: HTMLElement | null;
};
