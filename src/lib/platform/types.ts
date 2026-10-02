export type PlatformRole = 'super-admin' | 'operations-admin' | 'finance-admin' | 'support-agent';

export interface PlatformSession {
	userId: number;
	name: string;
	email: string;
	role: PlatformRole;
	mfaEnabled: boolean;
	scope: 'platform';
}

export interface PlatformLoginResult {
	session?: PlatformSession;
	mfaRequired: boolean;
	enrollmentRequired: boolean;
	challengeToken?: string;
	challengeExpiresAt?: string;
}

export interface PlatformUtility {
	id: number;
	slug: string;
	legalName: string;
	displayName: string;
	utilityType: string;
	officeAddress: string;
	region: string;
	province: string;
	city: string;
	authorityReference: string;
	estimatedAccounts: number;
	primaryContactName: string;
	primaryContactPhone: string;
	primaryContactEmail: string;
	enabledModules: string;
	status: 'Active' | 'Suspended' | 'Onboarding' | 'Migration Review';
	createdAt: string;
	updatedAt: string;
}

export interface PlatformUtilitySettings {
	currency: 'PHP';
	timezone: string;
	maximumAccounts: number;
	billingCycleLimit: number;
	storageLimitGb: number;
	slaTier: 'Standard' | 'Priority' | 'Enterprise';
	assignedOwner: string;
}

export interface UtilityUsageMetric {
	key: 'accounts' | 'meters' | 'staff' | 'billing_cycles' | 'storage';
	label: string;
	current: number | null;
	limit: number;
	unit: string;
	state: 'Normal' | 'Warning' | 'Exceeded' | 'Not configured' | 'Not measured';
	measured: boolean;
}

export interface UtilityUsage {
	metrics: UtilityUsageMetric[];
}

export interface UtilityActivationReadiness {
	ready: boolean;
	blockers: string[];
	serviceAreaCount: number;
	paymentTestPassed: boolean;
	realPaymentCollectionReady: boolean;
	requiredDocumentAccepted: boolean;
}

export interface UtilityImportIssue { row: number; field: string; message: string }
export interface UtilityImportValidation { batchId:number; status:string; rowCount:number; validCount:number; errorCount:number; errors:UtilityImportIssue[]; preview:{slug:string;legalName:string;displayName:string;region:string;primaryContactEmail:string;serviceAreaCount:number;estimatedAccounts:number}[] }
export interface UtilityImportBatch { id:number; createdAt:string; fileName:string; status:string; rowCount:number; validCount:number; errorCount:number; committedAt?:string }
export interface OnboardingDocument { id:number; createdAt:string; tenantId:number; category:string; originalFileName:string; mimeType:string; byteSize:number; status:'Draft'|'Submitted'|'Accepted'|'Rejected'|'Replaced'; scannerStatus:string; rejectionReason:string; submittedAt?:string; reviewedAt?:string }
export interface StarterTariffValidation { batchId:number; status:string; rowCount:number; validCount:number; errorCount:number; errors:UtilityImportIssue[]; draft?:Record<string,unknown>; simulation?:{consumption:string;total:string} }
export interface StarterTariffImportBatch { id:number; createdAt:string; fileName:string; status:string; rowCount:number; validCount:number; errorCount:number; committedAt?:string; tariffVersionId?:number }

export interface PlatformServiceArea {
	id: number;
	name: string;
	description: string;
}

export interface PaymentSetupConfig {
	id: number;
	tenantId: number;
	channel: 'GCash';
	merchantId: string;
	checkoutUrl: string;
	callbackUrl: string;
	credentialRef: string;
	feeModel: 'fixed' | 'percentage';
	transactionFee: string;
	convenienceFee: string;
	vatEnabled: boolean;
	feePayer: 'subscriber' | 'utility';
	settlementDestination: string;
	settlementCycle: 'daily' | 'weekly' | 'monthly';
	status: 'Testing' | 'Failed Test' | 'Disabled' | 'Active';
	lastTestStatus: string;
	lastTestAt?: string;
	revision: number;
}

export type PaymentSetupInput = Omit<
	PaymentSetupConfig,
	'id' | 'tenantId' | 'channel' | 'status' | 'lastTestStatus' | 'lastTestAt' | 'revision'
> & { reason: string };

export interface PaymentSetupState {
	config: PaymentSetupConfig | null;
	simulatorOnly: boolean;
	testAvailable: boolean;
	maxFlatFeePHP: string;
	maxFeePercent: string;
	vatRatePercent: string;
}

export interface PaymentFeeQuote {
	billAmount: string;
	transactionFee: string;
	convenienceFee: string;
	vat: string;
	totalFee: string;
	subscriberPays: string;
	utilityReceives: string;
	simulated: boolean;
}

export interface PaymentCallbackTest {
	id: number;
	createdAt: string;
	tenantId: number;
	amount: string;
	fee: string;
	status: string;
	providerReference: string;
	failureCode: string;
	configRevision: number;
}

export interface PaymentSetupNotice {
	id: number;
	createdAt: string;
	kind: string;
	message: string;
}

export interface PlatformUser {
	id: number;
	fullName: string;
	email: string;
	roleName: PlatformRole;
	status: 'Active' | 'Disabled' | 'Invited';
	mfaEnabled: boolean;
	lastLogin?: string;
	createdAt: string;
}

export interface PlatformAuditEntry {
	id: number;
	createdAt: string;
	actor: string;
	actorType: string;
	actorRole: string;
	action: string;
	resourceType: string;
	resourceId: string;
	details: string;
	requestId?: string;
	ipAddress?: string;
}

export interface PlatformLedgerPayment {
	id: number;
	tenantId: number;
	createdAt: string;
	amount: string;
	currency: string;
	method: string;
	status: string;
	accountMasked: string;
	referenceMasked: string;
	providerVerified: false;
	settlementVerified: false;
	billId?: number;
	fee: string;
	callbackStatus: string;
	postingStatus: string;
	settlementBatch: string;
}

export interface PlatformLedgerPaymentDetail extends PlatformLedgerPayment {
	providerTransactionMasked: string;
	evidenceState: string;
	reversals: {
		id: number;
		status: string;
		reason: string;
		resolutionNote?: string;
		originalAmount: string;
		providerState: string;
		createdAt: string;
	}[];
}

export interface PlatformServiceHealth {
	name: string;
	status: 'Healthy' | 'Critical' | 'Unknown';
	detail: string;
	latencyMs?: number;
	observedAt: string;
}

export interface PlatformHealthSnapshot {
	observedAt: string;
	services: PlatformServiceHealth[];
}

export interface PlatformIncident {
	id: number;
	createdAt: string;
	updatedAt: string;
	affectedTenantId?: number;
	serviceName: string;
	summary: string;
	severity: 'Low' | 'Medium' | 'High' | 'Critical';
	status: 'Open' | 'Resolved';
	ownerUserId: number;
	resolutionNote?: string;
	resolvedAt?: string;
}

export interface PlatformReportResult {
	type: 'utility_adoption' | 'active_accounts' | 'billing_records';
	basis: string;
	generatedAt: string;
	rows: { utilityId: number; utilityName: string; count: number }[];
	total: number;
}

export interface PlatformReportSchedule {
	id: number;
	reportType: PlatformReportResult['type'];
	filtersJson: string;
	recipientIdsJson: string;
	format: 'csv' | 'xlsx' | 'pdf';
	frequency: 'daily' | 'weekly' | 'monthly';
	timezone: string;
	nextRunAt: string;
	status: string;
	runs: {
		id: number;
		status: string;
		artifactName?: string;
		rowCount: number;
		deliveryStatus: string;
		errorMessage?: string;
		errorCategory?: string;
		originalRunId?: number;
		attemptNumber: number;
		createdAt: string;
	}[];
}

export interface PlatformReportRecipient {
	id: number;
	fullName: string;
	role: string;
	emailMasked: string;
}

export interface PlatformSupportCase {
	id: number;
	createdAt: string;
	updatedAt: string;
	tenantId: number;
	utilityTicketId?: number;
	subject: string;
	category: string;
	severity: 'Low' | 'Medium' | 'High' | 'Critical';
	status: 'Open' | 'Escalated' | 'Resolved' | 'Reopened';
	ownerPlatformUserId?: number;
	slaDueAt?: string;
	escalationReason?: string;
	resolutionSummary?: string;
	resolvedAt?: string;
}

export interface PlatformSupportNote {
	id: number;
	createdAt: string;
	caseId: number;
	authorPlatformUserId: number;
	body: string;
}

export interface PlatformSupportDetail {
	case: PlatformSupportCase;
	notes: PlatformSupportNote[];
}

export interface PlatformUtilityUser {
	id: number;
	tenantId: number;
	fullName: string;
	username: string;
	email: string;
	emailVerified: boolean;
	roleName: string;
	status: string;
	lastLogin?: string;
	createdAt: string;
}

export interface PlatformPage<T> {
	items: T[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

export interface PlatformDashboard {
	generatedAt: string;
	totalUtilities: number;
	activeUtilities: number;
	suspendedUtilities: number;
	onboardingUtilities: number;
	platformUsers: number;
	utilityUsers: number;
	paymentSetups: number;
	openIncidents: number;
	openSupportCases: number;
	billsGenerated: number;
	recordedPayments: number;
	totalPaymentVolume: string;
	recordedServiceFees: string;
	customers: number;
	meters: number;
	routes: number;
	readings: number;
	billingCycles: number;
	openExceptions: number;
	supportTickets: number;
	collectionRate?: string;
	financialDataVisible: boolean;
	recentUtilities: PlatformUtility[];
	recentAudit: PlatformAuditEntry[];
	deferredIntegrations: string[];
}

export interface UtilityOnboardingInput {
	slug: string;
	legalName: string;
	displayName: string;
	utilityType: string;
	officeAddress: string;
	region: string;
	province: string;
	city: string;
	authorityReference: string;
	estimatedAccounts: number;
	primaryContactName: string;
	primaryContactPhone: string;
	primaryContactEmail: string;
	serviceAreas: string[];
	enabledModules: string[];
	status: PlatformUtility['status'];
	currency: 'PHP';
	timezone: string;
	initialAdminName: string;
	initialAdminUsername: string;
	initialAdminEmail: string;
	initialAdminPassword: string;
}

export interface PlatformRoleTemplate {
	id: number;
	name: PlatformRole;
	displayName: string;
	description: string;
	permissions: string[];
}

export interface OnboardingDraft {
	id: number;
	name: string;
	slug: string;
	status: string;
	version: number;
	updatedAt: string;
	submittedAt?: string;
	payload: UtilityOnboardingInput;
}
export interface AuditRetentionPolicy {
	id: number;
	retentionDays: number;
	legalHold: boolean;
	legalHoldReason: string;
	updatedAt: string;
}
