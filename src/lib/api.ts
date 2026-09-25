import { env } from '$env/dynamic/public';

export type ApiMode = 'mock' | 'live';

export const API_BASE_URL =
	env.PUBLIC_API_BASE_URL ??
	(import.meta.env.VITE_API_BASE_URL as string | undefined) ??
	'';
export const API_MODE = (env.PUBLIC_API_MODE as ApiMode | undefined) ??
	(import.meta.env.VITE_API_MODE as ApiMode | undefined) ??
	'live';

export type ApiEnvelope<T> = {
	success: boolean;
	data?: T;
	message?: string;
	errorId?: string;
};

export class ApiError extends Error {
	status: number;
	errorId?: string;

	constructor(status: number, message: string, errorId?: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.errorId = errorId;
	}
}

export function isLiveApiEnabled(): boolean {
	return API_MODE !== 'mock' && Boolean(API_BASE_URL);
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
	if (!isLiveApiEnabled()) {
		return null;
	}

	const headers = new Headers(init?.headers ?? {});
	if (init?.body) {
		headers.set('Content-Type', 'application/json');
	}
	if (!headers.has('X-Request-ID')) {
		headers.set('X-Request-ID', crypto.randomUUID());
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers,
		credentials: 'include'
	});

	const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
	if (!response.ok || envelope?.success === false) {
		throw new ApiError(
			response.status,
			envelope?.message ?? `Request failed with status ${response.status}.`,
			envelope?.errorId
		);
	}

	return (envelope?.data ?? envelope) as T;
}
