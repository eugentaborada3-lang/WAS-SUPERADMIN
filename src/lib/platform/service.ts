import { apiFetch } from '$lib/api';
import type {
	PlatformAuditEntry,
	PlatformDashboard,
	PlatformLoginResult,
	PlatformPage,
	PlatformRoleTemplate,
	PlatformSession,
	PlatformUser,
	PlatformUtility,
	PlatformUtilitySettings,
	PaymentSetupConfig,
	PaymentSetupInput,
	PaymentSetupState,
	PaymentFeeQuote,
	PaymentCallbackTest,
	PaymentSetupNotice,
	UtilityOnboardingInput
} from './types';

const required = <T>(value: T | null, feature: string): T => {
	if (value === null) throw new Error(`${feature} requires the live platform API.`);
	return value;
};

export const platformService = {
	async login(email: string, password: string) {
		return required(
			await apiFetch<PlatformLoginResult>('/api/platform/auth/login', {
				method: 'POST',
				body: JSON.stringify({ email, password })
			}),
			'Platform login'
		);
	},
	async verifyMFA(challengeToken: string, code: string) {
		return required(
			await apiFetch<PlatformLoginResult>('/api/platform/auth/mfa/verify', {
				method: 'POST',
				body: JSON.stringify({ challengeToken, code })
			}),
			'MFA verification'
		);
	},
	async beginMFAEnrollment(challengeToken: string) {
		return required(
			await apiFetch<{ secret: string; uri: string; expiresAt: string }>(
				'/api/platform/auth/mfa/enroll',
				{ method: 'POST', body: JSON.stringify({ challengeToken }) }
			),
			'MFA enrollment'
		);
	},
	async confirmMFAEnrollment(challengeToken: string, code: string) {
		return required(
			await apiFetch<{ recoveryCodes: string[]; login: PlatformLoginResult }>('/api/platform/auth/mfa/confirm', {
				method: 'POST',
				body: JSON.stringify({ challengeToken, code })
			}),
			'MFA confirmation'
		);
	},
	async session() {
		return required(
			await apiFetch<PlatformSession>('/api/platform/auth/session'),
			'Platform session'
		);
	},
	async logout() {
		await apiFetch('/api/platform/auth/logout', { method: 'POST' });
	},
	async dashboard() {
		return required(
			await apiFetch<PlatformDashboard>('/api/platform/dashboard'),
			'Platform dashboard'
		);
	},
	async utilities(query: Record<string, string | number | undefined> = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<PlatformPage<PlatformUtility>>(`/api/platform/utilities?${params}`),
			'Utilities'
		);
	},
	async utility(id: number) {
		return required(
			await apiFetch<PlatformUtility>(`/api/platform/utilities/${id}`),
			'Utility profile'
		);
	},
	async utilitySettings(id: number) {
		return required(
			await apiFetch<PlatformUtilitySettings>(`/api/platform/utilities/${id}/settings`),
			'Utility settings'
		);
	},
	async paymentSetup(id: number) {
		return required(await apiFetch<PaymentSetupState>(`/api/platform/payment-setup/${id}`),'Payment setup');
	},
	async savePaymentSetup(id: number, input: PaymentSetupInput) {
		return required(await apiFetch<PaymentSetupConfig>(`/api/platform/payment-setup/${id}`,{method:'PUT',body:JSON.stringify(input)}),'Payment setup save');
	},
	async paymentQuote(id: number, amount: string) {
		return required(await apiFetch<PaymentFeeQuote>(`/api/platform/payment-setup/${id}/quote`,{method:'POST',body:JSON.stringify({amount})}),'Fee quote');
	},
	async paymentTest(id: number, amount: string, forceFailure: boolean, idempotencyKey: string) {
		return required(await apiFetch<PaymentCallbackTest>(`/api/platform/payment-setup/${id}/test`,{method:'POST',headers:{'Idempotency-Key':idempotencyKey},body:JSON.stringify({amount,forceFailure})}),'Callback test');
	},
	async paymentTestLogs(id: number) {
		return required(await apiFetch<PaymentCallbackTest[]>(`/api/platform/payment-setup/${id}/logs`),'Callback test logs');
	},
	async paymentNotices(id: number) {
		return required(await apiFetch<PaymentSetupNotice[]>(`/api/platform/payment-setup/${id}/notices`),'Payment notices');
	},
	async disablePaymentSetup(id: number, reason: string) {
		return required(await apiFetch<PaymentSetupConfig>(`/api/platform/payment-setup/${id}/disable`,{method:'POST',body:JSON.stringify({reason})}),'Disable payment setup');
	},
	async updateUtilitySettings(id: number, input: PlatformUtilitySettings & { reason: string }) {
		return required(
			await apiFetch<PlatformUtilitySettings>(`/api/platform/utilities/${id}/settings`, {
				method: 'PATCH',
				body: JSON.stringify(input)
			}),
			'Utility settings update'
		);
	},
	async onboardUtility(input: UtilityOnboardingInput) {
		return required(
			await apiFetch<PlatformUtility>('/api/platform/utilities', {
				method: 'POST',
				body: JSON.stringify(input)
			}),
			'Utility onboarding'
		);
	},
	async updateUtility(
		id: number,
		input: {
			reason: string;
			legalName?: string;
			displayName?: string;
			utilityType?: string;
			officeAddress?: string;
			primaryContactName?: string;
			primaryContactPhone?: string;
			primaryContactEmail?: string;
			enabledModules?: string[];
		}
	) {
		return required(
			await apiFetch<PlatformUtility>(`/api/platform/utilities/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(input)
			}),
			'Utility update'
		);
	},
	async changeUtilityStatus(id: number, status: PlatformUtility['status'], reason: string) {
		return required(
			await apiFetch<PlatformUtility>(`/api/platform/utilities/${id}/status`, {
				method: 'POST',
				body: JSON.stringify({ status, reason })
			}),
			'Utility status'
		);
	},
	async users(query: Record<string, string | number | undefined> = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<PlatformPage<PlatformUser>>(`/api/platform/users?${params}`),
			'Platform users'
		);
	},
	async createUser(input: {
		fullName: string;
		email: string;
		role: string;
	}) {
		return required(
			await apiFetch<{ user: PlatformUser; delivery: string; developmentLink?: string }>('/api/platform/users', {
				method: 'POST',
				body: JSON.stringify(input)
			}),
			'Platform user creation'
		);
	},
	async forgotPassword(email: string) {
		await apiFetch('/api/platform/auth/password/forgot', {method:'POST',body:JSON.stringify({email})});
	},
	async setPassword(token: string, password: string, invitation: boolean) {
		await apiFetch(invitation ? '/api/platform/auth/invite/accept' : '/api/platform/auth/password/reset', {method:'POST',body:JSON.stringify({token,password})});
	},
	async adminResetLink(id: number, reason: string, code: string) {
		return required(await apiFetch<{delivery:string;developmentLink?:string}>(`/api/platform/users/${id}/password/reset-link`, {method:'POST',body:JSON.stringify({reason,code})}),'Password reset link');
	},
	async updateUser(id: number, input: { fullName?: string; role?: string }) {
		return required(
			await apiFetch<PlatformUser>(`/api/platform/users/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(input)
			}),
			'Platform user update'
		);
	},
	async changeUserStatus(id: number, status: string, reason: string) {
		return required(
			await apiFetch<PlatformUser>(`/api/platform/users/${id}/status`, {
				method: 'POST',
				body: JSON.stringify({ status, reason })
			}),
			'Platform user status'
		);
	},
	async resetUserMFA(id: number, reason: string, code: string) {
		return required(
			await apiFetch<{ reset: boolean }>(`/api/platform/users/${id}/mfa/reset`, {
				method: 'POST',
				body: JSON.stringify({ reason, code })
			}),
			'MFA reset'
		);
	},
	async roles() {
		return required(
			await apiFetch<PlatformRoleTemplate[]>('/api/platform/roles'),
			'Platform roles'
		);
	},
	async audit(query: Record<string, string | number | undefined> = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<PlatformPage<PlatformAuditEntry>>(`/api/platform/audit?${params}`),
			'Platform audit'
		);
	}
};
