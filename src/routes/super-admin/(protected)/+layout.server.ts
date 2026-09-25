import { env } from '$env/dynamic/public';
import { error, redirect } from '@sveltejs/kit';
import type { PlatformSession } from '$lib/platform/types';
import type { LayoutServerLoad } from './$types';

type Envelope = { success: boolean; data?: PlatformSession };

const allowed = (role: PlatformSession['role'], path: string) => {
	if (role === 'super-admin') return true;
	if (path === '/super-admin/utilities/new') return role === 'operations-admin';
	if (path.startsWith('/super-admin/users'))
		return role === 'operations-admin' || role === 'support-agent';
	if (path.startsWith('/super-admin/roles'))
		return role === 'operations-admin' || role === 'support-agent';
	return true;
};

export const load: LayoutServerLoad = async ({ request, fetch, url }) => {
	const apiBaseUrl = env.PUBLIC_API_BASE_URL ?? 'http://localhost:8080';
	let response: Response;
	try {
		response = await fetch(`${apiBaseUrl}/api/platform/auth/session`, {
			headers: { cookie: request.headers.get('cookie') ?? '' }
		});
	} catch {
		throw error(503, 'The platform authentication service is unavailable.');
	}
	if (response.status === 401) throw redirect(303, '/super-admin/login');
	if (!response.ok)
		throw error(503, 'The platform authentication service could not verify this session.');
	const envelope = (await response.json()) as Envelope;
	if (!envelope.success || !envelope.data) throw redirect(303, '/super-admin/login');
	if (!allowed(envelope.data.role, url.pathname)) throw redirect(303, '/super-admin/access-denied');
	return { platformSession: envelope.data };
};
