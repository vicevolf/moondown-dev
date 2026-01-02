import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { env } from '$env/dynamic/private';

const DEFAULT_MODEL = 'xiaomi/mimo-v2-flash:free';

export async function POST({ request }: { request: Request }) {
	const { messages, apiKey }: { messages: UIMessage[]; apiKey?: string } = await request.json();

	// 优先使用前端传入的 key，否则使用环境变量
	const finalApiKey = apiKey || env.OPENROUTER_API_KEY;

	if (!finalApiKey) {
		return new Response(
			JSON.stringify({ error: 'API Key is required' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	// 使用环境变量指定的模型，否则使用默认模型
	const model = env.OPENROUTER_MODEL || DEFAULT_MODEL;

	const openrouter = createOpenRouter({
		apiKey: finalApiKey
	});

	const result = streamText({
		model: openrouter.chat(model),
		messages: convertToModelMessages(messages)
	});

	return result.toUIMessageStreamResponse();
};
