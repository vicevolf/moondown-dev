/**
 * MoonGravity - 物理文本缓冲区
 * 核心逻辑：让缓冲区内容撑满 BUFFER_DURATION 秒输出
 * 
 * 新架构：输出 revealIndex（字符索引）而非切片后的文本
 *        支持预渲染 + 渐显模式
 */

/** 缓冲区目标持续时间（秒） */
const BUFFER_DURATION = 3.0;

/** 收尾时的最大持续时间（秒） */
const FLUSH_DURATION = 2.0;

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
    velocity: number = 0;
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
        this.velocity = 0;
    }
}

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
        this.fullContent += text;
        if (!this.isRunning) {
            this.start();
        }
    }

    end(): void {
        this.isEnded = true;
    }

    reset(): void {
        this.stop();
        this.fullContent = '';
        this.revealIndex = 0;
        this.physics.reset();
        this.charAccumulator = 0;
        this.isEnded = false;
        this.endVelocity = null;
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
            this.revealIndex += actualChars;
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
