import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function GET() {
	return json({
		hasKey: !!env.OPENROUTER_API_KEY
	});
}
