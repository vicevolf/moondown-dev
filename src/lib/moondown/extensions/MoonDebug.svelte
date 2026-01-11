<script lang="ts">
    import { debugState } from "./debugStore";

    const DEBUG = import.meta.env.DEV;
</script>

{#if DEBUG && $debugState}
    <div
        style="
            position: fixed;
            top: 0.5rem;
            right: 0.5rem;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 0.75rem;
            padding: 0.5rem;
            border-radius: 0.25rem;
            font-family: monospace;
            z-index: 50;
        "
    >
        <div style="color: #34d399; font-weight: bold; margin-bottom: 0.25rem;">
            🌙 MoonGravity
        </div>
        <div>Buffer: {$debugState.bufferSize} chars</div>
        <div>Speed: {$debugState.velocity.toFixed(1)} c/s</div>
        <div>
            Reveal: {$debugState.revealIndex} / {$debugState.fullContentLength}
        </div>
        <div>Complete: {$debugState.isComplete ? "✅" : "⏳"}</div>
    </div>
{/if}
