import { micromark } from 'micromark';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';
import DOMPurify from 'dompurify';

/**
 * 表格状态检测
 * 返回: 'in-table' | 'table-end' | null
 */
function detectTableState(buffer: string): 'in-table' | 'table-end' | null {
	const lines = buffer.split('\n');
	let inTable = false;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const prev = lines[i - 1] ?? '';

		// header + separator => 表格开始
		if (!inTable && /\|/.test(prev) && /^\s*\|?[-: ]+\|[-| :]+\|?\s*$/.test(line)) {
			inTable = true;
			continue;
		}

		// 表格中：空行或非 | 开头 => 表格结束
		if (inTable && (line.trim() === '' || !line.trim().startsWith('|'))) {
			inTable = false;
		}
	}

	if (inTable) return 'in-table';

	// 检查最后一行是否刚结束表格
	const lastLine = lines.at(-1) ?? '';
	const prevLine = lines.at(-2) ?? '';
	if (/\|/.test(prevLine) && (lastLine.trim() === '' || !lastLine.trim().startsWith('|'))) {
		return 'table-end';
	}

	return null;
}

/**
 * 检测未闭合的行内样式（减少跳变感）
 * 检测当前行是否有未配对的 **、*、` 标记
 */
function hasUnclosedInlineStyle(text: string): boolean {
	const lastLine = text.split('\n').at(-1) ?? '';
	// ** 粗体
	if ((lastLine.match(/\*\*/g)?.length ?? 0) % 2 === 1) return true;
	// * 斜体（排除列表开头和 ** 中的 *）
	const italicMatches = lastLine.match(/(?<!\*)\*(?!\*)/g);
	if ((italicMatches?.length ?? 0) % 2 === 1) return true;
	// ` 行内代码（排除 ```）
	const inlineCodeMatches = lastLine.match(/`(?!``)/g);
	if ((inlineCodeMatches?.length ?? 0) % 2 === 1) return true;
	return false;
}

/**
 * 语义安全点检测：判断 buffer 是否处于可安全解析的状态
 * 分类策略：
 * 1. 强整体块（必须等完整）：表格、代码块
 * 2. 弱整体块：列表
 * 3. 行内样式：等待闭合
 * 4. 可流式：普通段落
 */
function shouldFlush(buffer: string): boolean {
	// 表格检测优先
	const tableState = detectTableState(buffer);
	if (tableState === 'table-end') return true;
	if (tableState === 'in-table') return false;

	// 代码块：fence 未闭合时不 flush
	const fences = buffer.match(/```/g)?.length ?? 0;
	if (fences % 2 === 1) return false;
	if (fences % 2 === 0 && fences > 0 && buffer.endsWith('\n')) return true;

	// 行内样式未闭合时不 flush（减少 **text** 的跳变）
	if (hasUnclosedInlineStyle(buffer)) return false;

	// 列表项正在输入
	if (buffer.endsWith('\n- ') || buffer.endsWith('\n* ')) return false;

	// 普通段落：双换行
	if (buffer.endsWith('\n\n')) return true;

	// 长内容单换行也可 flush（避免过长延迟）
	if (buffer.length > 80 && buffer.endsWith('\n')) return true;

	return false;
}

function sanitize(raw: string): string {
	return DOMPurify.sanitize(micromark(raw, {
		extensions: [gfmTable()],
		htmlExtensions: [gfmTableHtml()]
	}), {
		ALLOWED_TAGS: [
			'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
			'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
			'a', 'hr', 'del', 'ins', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
		],
		ALLOWED_ATTR: ['href', 'title', 'target', 'rel']
	});
}

/**
 * 创建流式 Markdown 渲染器
 * 使用 缓冲区 + requestAnimationFrame 实现平滑打字机效果
 */
export function createStreamRenderer() {
	// 待显示缓冲区（网络收到的数据先存这里）
	let remainText = '';
	// 已显示的完整文本
	let displayText = $state('');
	// 渲染后的 HTML
	let html = $state('');
	// 动画帧 ID
	let frameId: number | null = null;
	// 流是否结束
	let finished = false;

	// 动画循环：每帧从缓冲区取出部分文字显示
	function animate() {
		if (remainText.length > 0) {
			// 优化的动态速度算法：
			// - 基础速度：每帧 1-3 字符（保证打字机效果）
			// - 追赶速度：缓冲区过大时加速，但有上限（避免跳跃感）
			// - 平滑过渡：使用 sqrt 曲线让加速更自然
			const baseSpeed = 2;
			const catchUpSpeed = Math.ceil(Math.sqrt(remainText.length / 10));
			const fetchCount = Math.min(baseSpeed + catchUpSpeed, 8); // 最大 8 字符/帧
			const chunk = remainText.slice(0, fetchCount);
			remainText = remainText.slice(fetchCount);
			displayText += chunk;

			// 语义安全点检测后渲染 HTML
			if (shouldFlush(displayText) || remainText.length === 0) {
				html = sanitize(displayText);
			}
		}

		// 继续动画直到缓冲区清空且流结束
		if (remainText.length > 0 || !finished) {
			frameId = requestAnimationFrame(animate);
		} else {
			// 最终渲染
			html = sanitize(displayText);
			frameId = null;
		}
	}

	function startAnimation() {
		if (frameId === null) {
			finished = false;
			frameId = requestAnimationFrame(animate);
		}
	}

	function push(chunk: string) {
		remainText += chunk;
		startAnimation();
	}

	function reset() {
		if (frameId !== null) {
			cancelAnimationFrame(frameId);
			frameId = null;
		}
		remainText = '';
		displayText = '';
		html = '';
		finished = false;
	}

	function finalize() {
		finished = true;
		// 如果还有剩余内容，确保动画继续
		if (remainText.length > 0 && frameId === null) {
			frameId = requestAnimationFrame(animate);
		}
	}

	return {
		get html() { return html; },
		get buffer() { return displayText; },
		push,
		reset,
		finalize
	};
}
