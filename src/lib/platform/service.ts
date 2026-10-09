import {
	API_BASE_URL,
	ApiError,
	apiDownload,
	apiFetch,
	isLiveApiEnabled,
	type ApiEnvelope
} from '$lib/api';
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
	UtilityOnboardingInput,
	UtilityActivationReadiness,
	PlatformServiceArea,
	UtilityImportValidation,
	UtilityImportBatch,
	OnboardingDocument,
	StarterTariffValidation,
	StarterTariffImportBatch,
	PlatformLedgerPayment,
	PlatformLedgerPaymentDetail,
	PlatformHealthSnapshot,
	PlatformIncident,
	PlatformReportResult,
	PlatformReportSchedule,
	PlatformReportRecipient,
	PlatformSupportCase,
	PlatformSupportDetail,
	PlatformSupportNote,
	PlatformUtilityUser,
	PlatformNotificationPage
} from './types';

const required = <T>(value: T | null, feature: string): T => {
	if (value === null) throw new Error(`${feature} requires the live platform API.`);
	return value;
};

export const platformService = {
	async search(query: string) {
		return required(
			await apiFetch<import('./types').PlatformSearchResult[]>(
				`/api/platform/search?q=${encodeURIComponent(query)}`
			),
			'Platform search'
		);
	},
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
			await apiFetch<{ recoveryCodes: string[]; login: PlatformLoginResult }>(
				'/api/platform/auth/mfa/confirm',
				{
					method: 'POST',
					body: JSON.stringify({ challengeToken, code })
				}
			),
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
	async notifications(page = 1, pageSize = 20) {
		return required(
			await apiFetch<PlatformNotificationPage>(
				`/api/platform/notifications?page=${page}&pageSize=${pageSize}`
			),
			'Platform notifications'
		);
	},
	async markNotificationRead(id: number) {
		await apiFetch(`/api/platform/notifications/${id}/read`, { method: 'POST' });
	},
	async markAllNotificationsRead() {
		await apiFetch('/api/platform/notifications/read-all', { method: 'POST' });
	},
	async notificationPreferences() {
		return required(
			await apiFetch<import('./types').PlatformNotificationPreference[]>('/api/platform/notification-preferences'),
			'Notification preferences'
		);
	},
	async saveNotificationPreference(category: string, enabled: boolean) {
		await apiFetch('/api/platform/notification-preferences', {
			method: 'PUT',
			body: JSON.stringify({ category, enabled })
		});
	},
	async dashboard(query: Record<string, string | number | undefined> = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<PlatformDashboard>(`/api/platform/dashboard?${params}`),
			'Platform dashboard'
		);
	},
	async ledgerPayments(query: Record<string, string | number | undefined> = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<PlatformPage<PlatformLedgerPayment>>(`/api/platform/transactions?${params}`),
			'Utility payment ledger'
		);
	},
	async ledgerPayment(id: number) {
		return required(
			await apiFetch<PlatformLedgerPaymentDetail>(`/api/platform/transactions/${id}`),
			'Payment ledger detail'
		);
	},
	async confirmSettledReversal(id: number, reason: string, code: string) {
		return required(
			await apiFetch(`/api/platform/transactions/reversals/${id}/confirm`, {
				method: 'POST',
				body: JSON.stringify({ reason, code })
			}),
			'Settled reversal confirmation'
		);
	},
	async exportLedgerPayments(input: {
		tenantId?: number;
		status: string;
		search: string;
		reason: string;
	}) {
		return required(
			await apiFetch<{ csv: string; fileName: string; count: number }>(
				'/api/platform/transactions/export',
				{ method: 'POST', body: JSON.stringify(input) }
			),
			'Payment ledger export'
		);
	},
	async healthSnapshot() {
		return required(
			await apiFetch<PlatformHealthSnapshot>('/api/platform/monitoring/health'),
			'Platform health'
		);
	},
	async incidents(status = '') {
		const params = new URLSearchParams();
		if (status) params.set('status', status);
		return required(
			await apiFetch<PlatformIncident[]>(`/api/platform/monitoring/incidents?${params}`),
			'Platform incidents'
		);
	},
	async createIncident(input: {
		serviceName: string;
		summary: string;
		severity: PlatformIncident['severity'];
		affectedTenantId?: number;
	}) {
		return required(
			await apiFetch<PlatformIncident>('/api/platform/monitoring/incidents', {
				method: 'POST',
				body: JSON.stringify(input)
			}),
			'Create incident'
		);
	},
	async resolveIncident(id: number, resolutionNote: string) {
		return required(
			await apiFetch<PlatformIncident>(`/api/platform/monitoring/incidents/${id}/resolve`, {
				method: 'POST',
				body: JSON.stringify({ resolutionNote })
			}),
			'Resolve incident'
		);
	},
	async report(query: { type: string; from: string; until: string; tenantId: string }) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value) params.set(key, value);
		});
		return required(
			await apiFetch<PlatformReportResult>(`/api/platform/reports?${params}`),
			'Platform report'
		);
	},
	async exportReport(query: {
		type: string;
		from: string;
		until: string;
		tenantId: string;
		format: 'csv' | 'xlsx' | 'pdf';
		reason: string;
	}) {
		if (!isLiveApiEnabled()) throw new Error('The live platform reports API is not configured.');
		const response = await fetch(`${API_BASE_URL}/api/platform/reports/export`, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json', 'X-Request-ID': crypto.randomUUID() },
			body: JSON.stringify(query)
		});
		if (!response.ok) {
			const envelope = (await response.json().catch(() => null)) as ApiEnvelope<never> | null;
			throw new ApiError(
				response.status,
				envelope?.message ?? `Export failed with status ${response.status}.`,
				envelope?.errorId
			);
		}
		const disposition = response.headers.get('Content-Disposition') ?? '';
		const fileName =
			disposition.match(/filename="([^"]+)"/)?.[1] ?? `${query.type}.${query.format}`;
		return {
			blob: await response.blob(),
			fileName,
			count: Number(response.headers.get('X-Export-Row-Count') ?? '0')
		};
	},
	async reportSchedules() {
		return required(
			await apiFetch<PlatformReportSchedule[]>('/api/platform/report-schedules'),
			'Platform report schedules'
		);
	},
	async reportRecipients(reportType: string) {
		return required(
			await apiFetch<PlatformReportRecipient[]>(
				`/api/platform/report-recipients?reportType=${encodeURIComponent(reportType)}`
			),
			'Platform report recipients'
		);
	},
	async createReportSchedule(input: Record<string, unknown>) {
		return required(
			await apiFetch<PlatformReportSchedule>('/api/platform/report-schedules', {
				method: 'POST',
				body: JSON.stringify(input)
			}),
			'Platform report schedule'
		);
	},
	async updateReportSchedule(id: number, input: Record<string, unknown>) {
		return required(
			await apiFetch<PlatformReportSchedule>(`/api/platform/report-schedules/${id}`, {
				method: 'PUT',
				body: JSON.stringify(input)
			}),
			'Platform report schedule'
		);
	},
	async reportScheduleAction(id: number, action: 'pause' | 'resume' | 'archive' | 'run') {
		return required(
			await apiFetch<
				PlatformReportSchedule | { id: number; status: string; deliveryStatus: string }
			>(`/api/platform/report-schedules/${id}/${action}`, { method: 'POST' }),
			'Platform report schedule'
		);
	},
	async retryReportRun(scheduleId: number, runId: number) {
		return required(
			await apiFetch<{ id: number; status: string; deliveryStatus: string }>(
				`/api/platform/report-schedules/${scheduleId}/runs/${runId}/retry`,
				{ method: 'POST' }
			),
			'Platform report retry'
		);
	},
	async supportCases(query: { tenantId?: string; status?: string; search?: string } = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value) params.set(key, value);
		});
		return required(
			await apiFetch<PlatformSupportCase[]>(`/api/platform/support/cases?${params}`),
			'Platform support cases'
		);
	},
	async supportCase(id: number) {
		return required(
			await apiFetch<PlatformSupportDetail>(`/api/platform/support/cases/${id}`),
			'Platform support case'
		);
	},
	async createSupportCase(input: {
		tenantId: number;
		utilityTicketId?: number;
		subject: string;
		category: string;
		severity: string;
		slaDueAt: string;
	}) {
		return required(
			await apiFetch<PlatformSupportCase>('/api/platform/support/cases', {
				method: 'POST',
				body: JSON.stringify(input)
			}),
			'Create support case'
		);
	},
	async assignSupportCase(id: number, ownerId: number) {
		return required(
			await apiFetch<PlatformSupportCase>(`/api/platform/support/cases/${id}/assign`, {
				method: 'POST',
				body: JSON.stringify({ ownerId })
			}),
			'Assign support case'
		);
	},
	async escalateSupportCase(id: number, severity: string, reason: string) {
		return required(
			await apiFetch<PlatformSupportCase>(`/api/platform/support/cases/${id}/escalate`, {
				method: 'POST',
				body: JSON.stringify({ severity, reason })
			}),
			'Escalate support case'
		);
	},
	async resolveSupportCase(id: number, resolutionSummary: string) {
		return required(
			await apiFetch<PlatformSupportCase>(`/api/platform/support/cases/${id}/resolve`, {
				method: 'POST',
				body: JSON.stringify({ resolutionSummary })
			}),
			'Resolve support case'
		);
	},
	async reopenSupportCase(id: number, reason: string) {
		return required(
			await apiFetch<PlatformSupportCase>(`/api/platform/support/cases/${id}/reopen`, {
				method: 'POST',
				body: JSON.stringify({ reason })
			}),
			'Reopen support case'
		);
	},
	async addSupportNote(id: number, body: string) {
		return required(
			await apiFetch<PlatformSupportNote>(`/api/platform/support/cases/${id}/notes`, {
				method: 'POST',
				body: JSON.stringify({ body })
			}),
			'Add internal support note'
		);
	},
	async utilityUsers(
		query: {
			tenantId?: string;
			status?: string;
			search?: string;
			page?: number;
			pageSize?: number;
		} = {}
	) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<PlatformPage<PlatformUtilityUser>>(`/api/platform/utility-users?${params}`),
			'Utility users'
		);
	},
	async changeUtilityUserStatus(tenantId: number, userId: number, status: string, reason: string) {
		return required(
			await apiFetch<PlatformUtilityUser>(
				`/api/platform/utility-users/${tenantId}/${userId}/status`,
				{ method: 'POST', body: JSON.stringify({ status, reason }) }
			),
			'Utility user status'
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
	async utilityImportTemplate(format: 'csv' | 'xlsx') {
		return apiDownload(`/api/platform/utility-imports/template?format=${format}`);
	},
	async utilityImportHistory() {
		return required(
			await apiFetch<UtilityImportBatch[]>('/api/platform/utility-imports'),
			'Utility import history'
		);
	},
	async validateUtilityImport(file: File, worksheet = '') {
		const body = new FormData();
		body.set('file', file);
		if (worksheet) body.set('worksheet', worksheet);
		return required(
			await apiFetch<UtilityImportValidation>('/api/platform/utility-imports/validate', {
				method: 'POST',
				body
			}),
			'Utility import validation'
		);
	},
	async commitUtilityImport(batchId: number, file: File) {
		const body = new FormData();
		body.set('file', file);
		return required(
			await apiFetch<UtilityImportBatch>(`/api/platform/utility-imports/${batchId}/commit`, {
				method: 'POST',
				body
			}),
			'Utility import commit'
		);
	},
	async exportUtilities(query: Record<string, string | number | undefined> = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<{ csv: string; fileName: string; count: number }>(
				`/api/platform/utilities/export?${params}`
			),
			'Utility export'
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
	async utilityUsage(id: number) {
		return required(
			await apiFetch<import('./types').UtilityUsage>(`/api/platform/utilities/${id}/usage`),
			'Utility usage'
		);
	},
	async onboardingDocuments(id: number) {
		return required(
			await apiFetch<OnboardingDocument[]>(`/api/platform/onboarding-documents?tenantId=${id}`),
			'Onboarding documents'
		);
	},
	async uploadOnboardingDocument(id: number, category: string, file: File, replaceId?: number) {
		const body = new FormData();
		body.set('tenantId', String(id));
		body.set('category', category);
		body.set('file', file);
		if (replaceId) body.set('replaceId', String(replaceId));
		return required(
			await apiFetch<OnboardingDocument>('/api/platform/onboarding-documents', {
				method: 'POST',
				body
			}),
			'Onboarding document upload'
		);
	},
	async submitOnboardingDocument(id: number) {
		return required(
			await apiFetch<OnboardingDocument>(`/api/platform/onboarding-documents/${id}/submit`, {
				method: 'POST'
			}),
			'Onboarding document submission'
		);
	},
	async reviewOnboardingDocument(id: number, decision: 'Accepted' | 'Rejected', reason = '') {
		return required(
			await apiFetch<OnboardingDocument>(`/api/platform/onboarding-documents/${id}/review`, {
				method: 'POST',
				body: JSON.stringify({ decision, reason })
			}),
			'Onboarding document review'
		);
	},
	async downloadOnboardingDocument(id: number) {
		return apiDownload(`/api/platform/onboarding-documents/${id}/download`);
	},
	async starterTariffTemplate(format: 'csv' | 'xlsx') {
		return apiDownload(`/api/platform/starter-tariffs/template?format=${format}`);
	},
	async starterTariffHistory(id: number) {
		return required(
			await apiFetch<StarterTariffImportBatch[]>(`/api/platform/starter-tariffs?tenantId=${id}`),
			'Starter tariff history'
		);
	},
	async validateStarterTariff(id: number, file: File, worksheet = '') {
		const body = new FormData();
		body.set('tenantId', String(id));
		body.set('file', file);
		if (worksheet) body.set('worksheet', worksheet);
		return required(
			await apiFetch<StarterTariffValidation>('/api/platform/starter-tariffs/validate', {
				method: 'POST',
				body
			}),
			'Starter tariff validation'
		);
	},
	async commitStarterTariff(batchId: number, file: File) {
		const body = new FormData();
		body.set('file', file);
		return required(
			await apiFetch<StarterTariffImportBatch>(`/api/platform/starter-tariffs/${batchId}/commit`, {
				method: 'POST',
				body
			}),
			'Starter tariff commit'
		);
	},
	async activationReadiness(id: number) {
		return required(
			await apiFetch<UtilityActivationReadiness>(
				`/api/platform/utilities/${id}/activation-readiness`
			),
			'Activation readiness'
		);
	},
	async utilityServiceAreas(id: number) {
		return required(
			await apiFetch<PlatformServiceArea[]>(`/api/platform/utilities/${id}/service-areas`),
			'Service areas'
		);
	},
	async addUtilityServiceArea(id: number, name: string, description: string) {
		return required(
			await apiFetch<PlatformServiceArea>(`/api/platform/utilities/${id}/service-areas`, {
				method: 'POST',
				body: JSON.stringify({ name, description })
			}),
			'Add service area'
		);
	},
	async paymentSetup(id: number) {
		return required(
			await apiFetch<PaymentSetupState>(`/api/platform/payment-setup/${id}`),
			'Payment setup'
		);
	},
	async savePaymentSetup(id: number, input: PaymentSetupInput) {
		return required(
			await apiFetch<PaymentSetupConfig>(`/api/platform/payment-setup/${id}`, {
				method: 'PUT',
				body: JSON.stringify(input)
			}),
			'Payment setup save'
		);
	},
	async paymentQuote(id: number, amount: string) {
		return required(
			await apiFetch<PaymentFeeQuote>(`/api/platform/payment-setup/${id}/quote`, {
				method: 'POST',
				body: JSON.stringify({ amount })
			}),
			'Fee quote'
		);
	},
	async paymentTest(id: number, amount: string, forceFailure: boolean, idempotencyKey: string) {
		return required(
			await apiFetch<PaymentCallbackTest>(`/api/platform/payment-setup/${id}/test`, {
				method: 'POST',
				headers: { 'Idempotency-Key': idempotencyKey },
				body: JSON.stringify({ amount, forceFailure })
			}),
			'Callback test'
		);
	},
	async paymentTestLogs(id: number) {
		return required(
			await apiFetch<PaymentCallbackTest[]>(`/api/platform/payment-setup/${id}/logs`),
			'Callback test logs'
		);
	},
	async paymentNotices(id: number) {
		return required(
			await apiFetch<PaymentSetupNotice[]>(`/api/platform/payment-setup/${id}/notices`),
			'Payment notices'
		);
	},
	async disablePaymentSetup(id: number, reason: string) {
		return required(
			await apiFetch<PaymentSetupConfig>(`/api/platform/payment-setup/${id}/disable`, {
				method: 'POST',
				body: JSON.stringify({ reason })
			}),
			'Disable payment setup'
		);
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
			region?: string;
			province?: string;
			city?: string;
			authorityReference?: string;
			estimatedAccounts?: number;
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
	async financeSuspendUtility(id: number, reason: string, code: string) {
		return required(
			await apiFetch<PlatformUtility>(`/api/platform/utilities/${id}/finance-suspend`, {
				method: 'POST',
				body: JSON.stringify({ reason, code })
			}),
			'Finance-confirmed suspension'
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
	async createUser(input: { fullName: string; email: string; role: string }) {
		return required(
			await apiFetch<{ user: PlatformUser; delivery: string; developmentLink?: string }>(
				'/api/platform/users',
				{
					method: 'POST',
					body: JSON.stringify(input)
				}
			),
			'Platform user creation'
		);
	},
	async forgotPassword(email: string) {
		await apiFetch('/api/platform/auth/password/forgot', {
			method: 'POST',
			body: JSON.stringify({ email })
		});
	},
	async setPassword(token: string, password: string, invitation: boolean) {
		await apiFetch(
			invitation ? '/api/platform/auth/invite/accept' : '/api/platform/auth/password/reset',
			{ method: 'POST', body: JSON.stringify({ token, password }) }
		);
	},
	async adminResetLink(id: number, reason: string, code: string) {
		return required(
			await apiFetch<{ delivery: string; developmentLink?: string }>(
				`/api/platform/users/${id}/password/reset-link`,
				{ method: 'POST', body: JSON.stringify({ reason, code }) }
			),
			'Password reset link'
		);
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
	async permissions() {
		return required(
			await apiFetch<{ id: number; name: string; description: string }[]>(
				'/api/platform/permissions'
			),
			'Platform permissions'
		);
	},
	async updateRole(
		id: number,
		input: { displayName: string; description: string; permissions: string[]; reason: string }
	) {
		return required(
			await apiFetch<PlatformRoleTemplate>(`/api/platform/roles/${id}`, {
				method: 'PUT',
				body: JSON.stringify(input)
			}),
			'Role template update'
		);
	},
	async onboardingDrafts() {
		return required(
			await apiFetch<import('./types').OnboardingDraft[]>('/api/platform/onboarding-drafts'),
			'Onboarding drafts'
		);
	},
	async saveOnboardingDraft(
		input: { name: string; version: number; payload: UtilityOnboardingInput },
		id?: number
	) {
		return required(
			await apiFetch<import('./types').OnboardingDraft>(
				id ? `/api/platform/onboarding-drafts/${id}` : '/api/platform/onboarding-drafts',
				{ method: id ? 'PUT' : 'POST', body: JSON.stringify(input) }
			),
			'Onboarding draft'
		);
	},
	async submitOnboardingDraft(id: number, initialAdminPassword: string) {
		return required(
			await apiFetch<PlatformUtility>(`/api/platform/onboarding-drafts/${id}/submit`, {
				method: 'POST',
				body: JSON.stringify({ initialAdminPassword })
			}),
			'Onboarding submission'
		);
	},
	async accessLogs(
		query: {
			search?: string;
			scope?: string;
			action?: string;
			page?: number;
			pageSize?: number;
		} = {}
	) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		return required(
			await apiFetch<PlatformPage<PlatformAuditEntry>>(`/api/platform/access-logs?${params}`),
			'Access logs'
		);
	},
	async exportAccessLogs(
		reason: string,
		filters: { search?: string; scope?: string; action?: string } = {}
	) {
		return required(
			await apiFetch<{ csv: string; fileName: string; count: number }>(
				'/api/platform/access-logs/export',
				{ method: 'POST', body: JSON.stringify({ reason, ...filters }) }
			),
			'Access log export'
		);
	},
	async auditRetention() {
		return required(
			await apiFetch<import('./types').AuditRetentionPolicy>('/api/platform/audit/retention'),
			'Audit retention'
		);
	},
	async updateAuditRetention(input: {
		retentionDays: number;
		legalHold: boolean;
		legalHoldReason: string;
		reason: string;
		code: string;
	}) {
		return required(
			await apiFetch<import('./types').AuditRetentionPolicy>('/api/platform/audit/retention', {
				method: 'PUT',
				body: JSON.stringify(input)
			}),
			'Audit retention update'
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
	},
	async exportAudit(input: {
		reason: string;
		search: string;
		action: string;
		resourceType: string;
		actor: string;
		from: string;
		until: string;
		tenantId?: number;
	}) {
		return required(
			await apiFetch<{ csv: string; fileName: string; count: number }>(
				'/api/platform/audit/export',
				{ method: 'POST', body: JSON.stringify(input) }
			),
			'Audit export'
		);
	}
};
