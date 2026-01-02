/**
 * MoonGravity - 物理文本缓冲区
 * 核心逻辑：让缓冲区内容撑满 BUFFER_DURATION 秒输出
 */

/** 缓冲区目标持续时间（秒） */
const BUFFER_DURATION = 3.0;

/** 收尾时的最大持续时间（秒） */
const FLUSH_DURATION = 2.0;

export interface BufferState {
    displayedText: string;
    bufferedText: string;
    velocity: number;
    isRunning: boolean;
    isEnded: boolean;
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
    private buffer: string = '';
    private displayed: string = '';
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

    push(text: string): void {
        this.buffer += text;
        if (!this.isRunning) {
            this.start();
        }
    }

    end(): void {
        this.isEnded = true;
    }

    reset(): void {
        this.stop();
        this.buffer = '';
        this.displayed = '';
        this.physics.reset();
        this.charAccumulator = 0;
        this.isEnded = false;
        this.endVelocity = null;
        this.notifyUpdate();
    }

    /**
     * 计算目标速度
     * 核心逻辑：缓冲区字符数 / 目标持续时间
     */
    private getTargetVelocity(): number {
        const n = this.buffer.length;

        if (this.isEnded) {
            // 首次进入结束状态，锁定目标速度
            if (this.endVelocity === null) {
                const currentVelocity = this.physics.velocity;
                const canFinishInTime = n <= currentVelocity * FLUSH_DURATION;
                this.endVelocity = canFinishInTime ? currentVelocity : n / FLUSH_DURATION;
            }
            return this.endVelocity;
        }

        return n / BUFFER_DURATION;
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

        // 输出字符
        this.charAccumulator += this.physics.velocity * dt;
        const charsToShow = Math.floor(this.charAccumulator);
        this.charAccumulator -= charsToShow;

        if (charsToShow > 0 && this.buffer.length > 0) {
            const actualChars = Math.min(charsToShow, this.buffer.length);
            this.displayed += this.buffer.slice(0, actualChars);
            this.buffer = this.buffer.slice(actualChars);
            this.notifyUpdate();
        }

        // 继续或停止
        if (this.buffer.length === 0 && this.isEnded) {
            this.stop();
            this.notifyUpdate(); // 通知订阅者缓冲区已完成
        } else {
            this.animationFrame = requestAnimationFrame(this.tick);
        }
    };

    private notifyUpdate(): void {
        this.onUpdate({
            displayedText: this.displayed,
            bufferedText: this.buffer,
            velocity: this.physics.velocity,
            isRunning: this.isRunning,
            isEnded: this.isEnded
        });
    }

    destroy(): void {
        this.stop();
    }
}
