import type { Extension } from 'micromark-util-types';
import type { Extension as MdastExtension } from 'mdast-util-from-markdown';

interface MathModules {
    math: (options?: any) => Extension;
    mathFromMarkdown: (options?: any) => MdastExtension;
    katex: any;
}

class MathLoader {
    private modules: MathModules | null = null;
    private loadingPromise: Promise<MathModules> | null = null;
    private isCSSLoaded = false;

    /**
     * 加载 Math 相关依赖 (Lazy Load)
     */
    async load(): Promise<MathModules> {
        if (this.modules) {
            return this.modules;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = (async () => {
            console.log('[🌙 Moondown] 开始动态加载 LaTeX 依赖...');
            const startTime = performance.now();

            const [
                { math },
                { mathFromMarkdown },
                katex
            ] = await Promise.all([
                import('micromark-extension-math'),
                import('mdast-util-math'),
                // @ts-ignore
                import('katex')
            ]).catch(err => {
                console.error('[🌙 Moondown] LaTeX 依赖加载失败:', err);
                throw err;
            });

            // 加载 CSS (使用本地文件)
            if (!this.isCSSLoaded) {
                try {
                    // @ts-ignore
                    await import('./extensions/katex-min.css');
                    this.isCSSLoaded = true;
                    console.log('[🌙 Moondown] 本地 KaTeX CSS 已加载');
                } catch (e) {
                    console.error('[🌙 Moondown] 本地 KaTeX CSS 加载失败:', e);
                }
            }

            console.log(`[🌙 Moondown] LaTeX 依赖加载完成 (${(performance.now() - startTime).toFixed(1)}ms)`);

            this.modules = {
                math,
                mathFromMarkdown,
                katex: katex.default || katex
            };

            return this.modules;
        })();

        return this.loadingPromise;
    }

    /**
     * 同步获取已加载的 katex 实例 (仅在确保已加载后使用)
     */
    getKatex(): any {
        return this.modules?.katex;
    }

    isLoaded(): boolean {
        return !!this.modules;
    }
}

export const mathLoader = new MathLoader();
