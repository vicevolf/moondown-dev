import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

const MODEL = 'xiaomi/mimo-v2-flash:free';

export async function POST({ request }: { request: Request }) {
	const { messages, apiKey }: { messages: UIMessage[]; apiKey: string } = await request.json();

	const openrouter = createOpenRouter({
		apiKey: apiKey
	});

	const result = streamText({
		model: openrouter.chat(MODEL),
		messages: convertToModelMessages(messages)
	});

	return result.toUIMessageStreamResponse();
};
