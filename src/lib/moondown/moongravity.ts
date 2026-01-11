/**
 * MoonGravity - 物理文本缓冲区
 * 核心逻辑：让缓冲区内容撑满 BUFFER_DURATION 秒输出
 * 
 * 新架构：输出 revealIndex（字符索引）而非切片后的文本
 *        支持预渲染 + 渐显模式
 */

/** 基准节流时间（秒） */
export const BASE_THROTTLE_SECONDS = 0.8;

/** 缓冲区目标持续时间（秒）= 3x 基准 */
const BUFFER_DURATION = BASE_THROTTLE_SECONDS * 3.0;

/** 收尾时的最大持续时间（秒）= 2x 基准 */
const FLUSH_DURATION = BASE_THROTTLE_SECONDS * 2.0;

export interface BufferState {
    /** 当前应显示到第几个字符（0-indexed, exclusive） */
    revealIndex: number;
    /** 完整内容长度 */
    totalLength: number;
    /** 待显示的缓冲区长度 */
    bufferSize: number;
    /** 当前速度 (字符/秒) */
    velocity: number;
    /** 是否正在运行 */
    isRunning: boolean;
    /** 网络流是否已结束 */
    isEnded: boolean;
    /** 缓冲区是否已完全输出 */
    isComplete: boolean;
}

export type BufferCallback = (state: BufferState) => void;

/**
 * 简单的弹簧-阻尼物理系统
 * 平滑过渡到目标速度
 */
class SpringPhysics {
    velocity: number = 30;  // 初始速度 30 c/s，避免冷启动
    private stiffness: number = 5.0;  // 弹簧刚度
    private damping: number = 2.5;    // 阻尼系数

    update(targetVelocity: number, dt: number): void {
        // 弹簧力：拉向目标速度
        const springForce = this.stiffness * (targetVelocity - this.velocity);
        // 阻尼力：低速时减弱，高速时增强（跑车启动特性）
        const speedRatio = Math.min(this.velocity / 50, 1); // 50 c/s 时达到全阻尼
        const dampingForce = -this.damping * this.velocity * speedRatio;

        // 更新速度
        this.velocity += (springForce + dampingForce) * dt;
        this.velocity = Math.max(0, this.velocity);
    }

    reset(): void {
        this.velocity = 30;
    }
}

// 调试开关：开发模式自动启用
const DEBUG = import.meta.env.DEV;

export class TextBuffer {
    /** 完整内容（网络接收的全部文本） */
    private fullContent: string = '';
    /** 已显示到的字符索引 */
    private revealIndex: number = 0;
    private isRunning: boolean = false;
    private isEnded: boolean = false;
    private endVelocity: number | null = null;

    private physics: SpringPhysics = new SpringPhysics();
    private lastTick: number = 0;
    private animationFrame: number | null = null;
    private charAccumulator: number = 0;

    private onUpdate: BufferCallback;

    // 时间戳追踪（用于最终汇报）
    private timeFirstCharReceived: number = 0;   // 收到首字
    private timeFirstCharRevealed: number = 0;   // 首字上屏
    private timeLastCharReceived: number = 0;    // 收到尾字
    private hasReportedStats: boolean = false;   // 避免重复汇报

    constructor(onUpdate: BufferCallback) {
        this.onUpdate = onUpdate;
    }

    /** 获取完整内容（供 Moondown 解析） */
    getFullContent(): string {
        return this.fullContent;
    }

    /** 获取当前显示索引 */
    getRevealIndex(): number {
        return this.revealIndex;
    }

    push(text: string): void {
        // 记录：收到首字
        if (this.timeFirstCharReceived === 0 && text.length > 0) {
            this.timeFirstCharReceived = performance.now();
        }

        this.fullContent += text;
        if (!this.isRunning) {
            this.start();
        }
    }

    end(): void {
        this.isEnded = true;
        // 记录：收到尾字
        if (this.timeLastCharReceived === 0) {
            this.timeLastCharReceived = performance.now();
        }
    }

    reset(): void {
        this.stop();
        this.fullContent = '';
        this.revealIndex = 0;
        this.physics.reset();
        this.charAccumulator = 0;
        this.isEnded = false;
        this.endVelocity = null;
        // 重置时间戳追踪
        this.timeFirstCharReceived = 0;
        this.timeFirstCharRevealed = 0;
        this.timeLastCharReceived = 0;
        this.hasReportedStats = false;
        this.notifyUpdate();
    }

    /**
     * 计算目标速度
     * 核心逻辑：待显示字符数 / 目标持续时间
     */
    private getTargetVelocity(): number {
        const remaining = this.fullContent.length - this.revealIndex;

        if (this.isEnded) {
            // 首次进入结束状态，锁定目标速度
            if (this.endVelocity === null) {
                const currentVelocity = this.physics.velocity;
                const canFinishInTime = remaining <= currentVelocity * FLUSH_DURATION;
                this.endVelocity = canFinishInTime ? currentVelocity : remaining / FLUSH_DURATION;
            }
            return this.endVelocity;
        }

        return remaining / BUFFER_DURATION;
    }

    private start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTick = performance.now();
        this.tick();
    }

    private stop(): void {
        this.isRunning = false;
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    private tick = (): void => {
        if (!this.isRunning) return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTick) / 1000, 0.1);
        this.lastTick = now;

        // 物理更新
        const targetVelocity = this.getTargetVelocity();
        this.physics.update(targetVelocity, dt);

        // 更新 revealIndex
        this.charAccumulator += this.physics.velocity * dt;
        const charsToReveal = Math.floor(this.charAccumulator);
        this.charAccumulator -= charsToReveal;

        const remaining = this.fullContent.length - this.revealIndex;
        if (charsToReveal > 0 && remaining > 0) {
            const actualChars = Math.min(charsToReveal, remaining);
            const prevRevealIndex = this.revealIndex;
            this.revealIndex += actualChars;

            // 记录：首字上屏
            if (this.timeFirstCharRevealed === 0 && prevRevealIndex === 0 && this.revealIndex > 0) {
                this.timeFirstCharRevealed = performance.now();
            }

            this.notifyUpdate();
        }

        // 继续或停止
        if (this.revealIndex >= this.fullContent.length && this.isEnded) {
            this.stop();
            this.notifyUpdate(); // 通知订阅者缓冲区已完成
        } else {
            this.animationFrame = requestAnimationFrame(this.tick);
        }
    };

    private notifyUpdate(): void {
        const remaining = this.fullContent.length - this.revealIndex;
        const isComplete = this.isEnded && remaining === 0 && !this.isRunning;

        // 尾字上屏时统一汇报
        if (isComplete && DEBUG && !this.hasReportedStats && this.timeFirstCharReceived > 0) {
            this.hasReportedStats = true;
            const now = performance.now();
            const firstCharDelay = this.timeFirstCharRevealed - this.timeFirstCharReceived;
            const networkTime = this.timeLastCharReceived - this.timeFirstCharReceived;
            const totalTime = now - this.timeFirstCharReceived;

            console.log(
                `%c[🌙 Moondown] 流式完成%c | 首字延迟 %c${firstCharDelay.toFixed(0)}ms%c | 网络耗时 %c${networkTime.toFixed(0)}ms%c | 总耗时 %c${totalTime.toFixed(0)}ms%c | 总字符 %c${this.fullContent.length}`,
                'color: #9b59b6; font-weight: bold',
                'color: #888',
                'color: #2ecc71; font-weight: bold',
                'color: #888',
                'color: #e67e22; font-weight: bold',
                'color: #888',
                'color: #3498db; font-weight: bold',
                'color: #888',
                'color: #888; font-weight: bold'
            );
        }

        this.onUpdate({
            revealIndex: this.revealIndex,
            totalLength: this.fullContent.length,
            bufferSize: remaining,
            velocity: this.physics.velocity,
            isRunning: this.isRunning,
            isEnded: this.isEnded,
            isComplete
        });
    }

    destroy(): void {
        this.stop();
    }
}
