<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import './page.css';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { OnboardingDocument, PlatformAuditEntry, PlatformUtility, StarterTariffImportBatch, StarterTariffValidation, UtilityActivationReadiness, PlatformServiceArea, UtilityUsage } from '$lib/platform/types';

	const utilityId = $derived(Number(page.params.id));
	let utility = $state<PlatformUtility | null>(null);
	let audit = $state<PlatformAuditEntry[]>([]);
	let readiness = $state<UtilityActivationReadiness | null>(null);
	let serviceAreas = $state<PlatformServiceArea[]>([]);
	let usage = $state<UtilityUsage | null>(null);
	let documents = $state<OnboardingDocument[]>([]);
	let tariffHistory = $state<StarterTariffImportBatch[]>([]);
	let tariffValidation = $state<StarterTariffValidation | null>(null);
	let documentFile = $state<File | null>(null);
	let documentCategory = $state('legal_authority');
	let documentReplaceId = $state<number | undefined>(undefined);
	let tariffFile = $state<File | null>(null);
	let tariffWorksheet = $state('');
	let documentRejectReasons = $state<Record<number, string>>({});
	let newAreaName = $state('');
	let newAreaDescription = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let displayName = $state('');
	let legalName = $state('');
	let officeAddress = $state('');
	let primaryContactName = $state('');
	let primaryContactEmail = $state('');
	let primaryContactPhone = $state('');
	let utilityType = $state('');
	let region = $state('');
	let province = $state('');
	let city = $state('');
	let authorityReference = $state('');
	let estimatedAccounts = $state(0);
	let enabledModules = $state<string[]>([]);
	let nextStatus = $state<PlatformUtility['status']>('Active');
	let reason = $state('');
	let profileReason = $state('');
	let currency = $state<'PHP'>('PHP');
	let timezone = $state('Asia/Manila');
	let maximumAccounts = $state(100000);
	let billingCycleLimit = $state(24);
	let storageLimitGb = $state(10);
	let slaTier = $state<'Standard' | 'Priority' | 'Enterprise'>('Standard');
	let assignedOwner = $state('');
	let settingsReason = $state('');
	let confirmingStatus = $state(false);
	let financeReason = $state('');
	let financeCode = $state('');
	let confirmingFinance = $state(false);
	const canManage = $derived(
		['super-admin', 'operations-admin'].includes(page.data.platformSession?.role)
	);
	const removedModules = $derived(
		utility
			? utility.enabledModules.split(',').filter((name) => name && !enabledModules.includes(name))
			: []
	);
	const modules = [
		'customers',
		'meters',
		'readings',
		'billing',
		'support',
		'reports',
		'advisories'
	];

	function populate(value: PlatformUtility) {
		utility = value;
		displayName = value.displayName;
		legalName = value.legalName;
		officeAddress = value.officeAddress;
		primaryContactName = value.primaryContactName;
		primaryContactEmail = value.primaryContactEmail;
		primaryContactPhone = value.primaryContactPhone;
		utilityType = value.utilityType;
		region = value.region;
		province = value.province;
		city = value.city;
		authorityReference = value.authorityReference;
		estimatedAccounts = value.estimatedAccounts;
		enabledModules = value.enabledModules.split(',').filter((name) => name && name !== 'payments');
		nextStatus = value.status;
	}
	async function load() {
		loading = true;
		errorMessage = '';
		try {
			const [record, log, settings, activation, areas, usageSnapshot, documentItems, tariffItems] = await Promise.all([
				platformService.utility(utilityId),
				page.data.platformSession?.role === 'support-agent' ? Promise.resolve({ items: [] as PlatformAuditEntry[] }) : platformService.audit({ tenantId: utilityId, pageSize: 10 }),
				platformService.utilitySettings(utilityId),
				platformService.activationReadiness(utilityId),
				platformService.utilityServiceAreas(utilityId),
				platformService.utilityUsage(utilityId),
				platformService.onboardingDocuments(utilityId),
				platformService.starterTariffHistory(utilityId)
			]);
			populate(record);
			audit = log.items;
			readiness = activation;
			serviceAreas = areas;
			usage = usageSnapshot;
			documents = documentItems;
			tariffHistory = tariffItems;
			currency = settings.currency;
			timezone = settings.timezone;
			maximumAccounts = settings.maximumAccounts;
			billingCycleLimit = settings.billingCycleLimit;
			storageLimitGb = settings.storageLimitGb;
			slaTier = settings.slaTier;
			assignedOwner = settings.assignedOwner;
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to load utility.';
		} finally {
			loading = false;
		}
	}
	async function save() {
		if (!profileReason.trim()) {
			errorMessage = 'A reason is required for profile changes.';
			return;
		}
		if (utility && utility.enabledModules.split(',').filter(Boolean).sort().join(',') !== [...enabledModules].sort().join(',')) {
			if (!confirm(`Confirm module changes for ${utility.displayName}? Removed modules stop new access but do not delete records.`)) return;
		}
		saving = true;
		errorMessage = '';
		successMessage = '';
		try {
			const updated = await platformService.updateUtility(utilityId, {
				reason: profileReason,
				displayName,
				legalName,
				officeAddress,
				region,
				province,
				city,
				authorityReference,
				estimatedAccounts,
				primaryContactName,
				primaryContactEmail,
				primaryContactPhone,
				utilityType,
				enabledModules
			});
			populate(updated);
			readiness = await platformService.activationReadiness(utilityId);
			profileReason = '';
			successMessage = 'Utility profile saved.';
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to save utility.';
		} finally {
			saving = false;
		}
	}
	async function changeStatus() {
		if (!reason.trim()) {
			errorMessage = 'A reason is required for status changes.';
			return;
		}
		saving = true;
		errorMessage = '';
		successMessage = '';
		try {
			const updated = await platformService.changeUtilityStatus(utilityId, nextStatus, reason);
			populate(updated);
			readiness = await platformService.activationReadiness(utilityId);
			reason = '';
			confirmingStatus = false;
			successMessage = 'Utility status changed and audited.';
			await loadAudit();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to change status.';
		} finally {
			saving = false;
		}
	}
	async function loadAudit() {
		if (page.data.platformSession?.role === 'support-agent') return;
		audit = (await platformService.audit({ tenantId: utilityId, pageSize: 10 })).items;
	}
	async function saveSettings() {
		if (!settingsReason.trim()) {
			errorMessage = 'A reason is required for setting changes.';
			return;
		}
		saving = true;
		errorMessage = '';
		successMessage = '';
		try {
			const settings = await platformService.updateUtilitySettings(utilityId, {
				currency,
				timezone,
				maximumAccounts,
				billingCycleLimit,
				storageLimitGb,
				slaTier,
				assignedOwner,
				reason: settingsReason
			});
			currency = settings.currency;
			timezone = settings.timezone;
			maximumAccounts = settings.maximumAccounts;
			billingCycleLimit = settings.billingCycleLimit;
			storageLimitGb = settings.storageLimitGb;
			slaTier = settings.slaTier;
			assignedOwner = settings.assignedOwner;
			usage = await platformService.utilityUsage(utilityId);
			settingsReason = '';
			successMessage = 'Tenant settings saved and audited.';
			await loadAudit();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to save tenant settings.';
		} finally {
			saving = false;
		}
	}
	async function addArea() {
		if (!newAreaName.trim()) { errorMessage = 'Enter a service area name.'; return; }
		saving = true; errorMessage = ''; successMessage = '';
		try {
			await platformService.addUtilityServiceArea(utilityId, newAreaName, newAreaDescription);
			serviceAreas = await platformService.utilityServiceAreas(utilityId);
			readiness = await platformService.activationReadiness(utilityId);
			newAreaName = ''; newAreaDescription = '';
			successMessage = 'Service area added and audited.';
			await loadAudit();
		} catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to add service area.'; }
		finally { saving = false; }
	}
	async function financeSuspend() {
		if (!financeReason.trim() || !financeCode.trim()) { errorMessage = 'A reason and your current MFA code are required.'; return; }
		saving = true; errorMessage = ''; successMessage = '';
		try {
			const updated = await platformService.financeSuspendUtility(utilityId, financeReason, financeCode);
			populate(updated);
			financeReason = ''; financeCode = ''; confirmingFinance = false;
			successMessage = 'Finance-confirmed suspension was recorded. Payment settlement status was not changed.';
			await loadAudit();
		} catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to suspend utility.'; }
		finally { saving = false; }
	}
	function saveBlob(blob: Blob, fileName: string) {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url; link.download = fileName; link.click();
		URL.revokeObjectURL(url);
	}
	async function uploadDocument() {
		if (!documentFile) { errorMessage = 'Choose a PDF, PNG, or JPEG document.'; return; }
		saving = true; errorMessage = ''; successMessage = '';
		try {
			await platformService.uploadOnboardingDocument(utilityId, documentCategory, documentFile, documentReplaceId);
			documents = await platformService.onboardingDocuments(utilityId);
			documentFile = null; documentReplaceId = undefined;
			successMessage = 'Document uploaded as a draft. Malware scanning is not connected.';
			await loadAudit();
		} catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to upload document.'; }
		finally { saving = false; }
	}
	async function submitDocument(id: number) {
		saving = true; errorMessage = ''; successMessage = '';
		try { await platformService.submitOnboardingDocument(id); documents = await platformService.onboardingDocuments(utilityId); successMessage = 'Document submitted for review.'; await loadAudit(); }
		catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to submit document.'; }
		finally { saving = false; }
	}
	async function reviewDocument(id: number, decision: 'Accepted' | 'Rejected') {
		const reviewReason = documentRejectReasons[id]?.trim() ?? '';
		if (decision === 'Rejected' && !reviewReason) { errorMessage = 'A rejection reason is required.'; return; }
		if (!confirm(`${decision === 'Accepted' ? 'Accept' : 'Reject'} this onboarding document?`)) return;
		saving = true; errorMessage = ''; successMessage = '';
		try {
			await platformService.reviewOnboardingDocument(id, decision, reviewReason);
			documents = await platformService.onboardingDocuments(utilityId);
			readiness = await platformService.activationReadiness(utilityId);
			successMessage = `Document ${decision.toLowerCase()} and audited.`;
			await loadAudit();
		} catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to review document.'; }
		finally { saving = false; }
	}
	async function downloadDocument(item: OnboardingDocument) {
		try { saveBlob(await platformService.downloadOnboardingDocument(item.id), item.originalFileName); }
		catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to download document.'; }
	}
	async function downloadTariffTemplate(format: 'csv' | 'xlsx') {
		try { saveBlob(await platformService.starterTariffTemplate(format), `starter-tariff-template.${format}`); }
		catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to download template.'; }
	}
	async function validateTariff() {
		if (!tariffFile) { errorMessage = 'Choose a CSV or XLSX starter-tariff file.'; return; }
		saving = true; errorMessage = ''; tariffValidation = null;
		try { tariffValidation = await platformService.validateStarterTariff(utilityId, tariffFile, tariffWorksheet); }
		catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to validate starter tariff.'; }
		finally { saving = false; }
	}
	async function commitTariff() {
		if (!tariffFile || !tariffValidation || tariffValidation.errorCount > 0) return;
		if (!confirm('Create this tenant-owned tariff draft? It will not be published or activated.')) return;
		saving = true; errorMessage = ''; successMessage = '';
		try {
			await platformService.commitStarterTariff(tariffValidation.batchId, tariffFile);
			tariffHistory = await platformService.starterTariffHistory(utilityId);
			tariffFile = null; tariffValidation = null;
			successMessage = 'Starter tariff imported as a draft. Utility GM approval and publication remain required.';
			await loadAudit();
		} catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to create tariff draft.'; }
		finally { saving = false; }
	}
	onMount(load);
</script>

<svelte:head><title>{utility?.displayName ?? 'Utility'} | WAS Platform</title></svelte:head>
<div class="platform-utility-detail-page">
{#if loading}<StatePanel
		variant="loading"
		title="Loading utility profile"
	/>{:else if !utility}<StatePanel
		variant="warning"
		title="Utility unavailable"
		message={errorMessage}
	/>{:else}
	<header class="mb-7 flex flex-wrap items-end justify-between gap-4">
		<div>
			<a href="/super-admin/utilities" class="text-sm text-cyan-400">← Utilities</a>
			<h1 class="mt-3 text-3xl font-bold">{utility.displayName}</h1>
			<p class="mt-2 text-slate-400">{utility.slug} · Tenant #{utility.id}</p>
		</div>
		<span class="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm"
			>{utility.status}</span
		>
	</header>
	{#if ['super-admin','finance-admin'].includes(page.data.platformSession?.role)}<a class="mb-6 inline-block rounded-xl border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-200" href={`/super-admin/payment-setup/${utility.id}`}>Open GCash payment setup</a>{/if}
	<section class="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-label="Operational activation readiness">
		<h2 class="font-bold">Operational activation readiness</h2>
		{#if readiness}
			<p class="mt-2 text-sm text-slate-300">{readiness.ready ? 'Required setup is ready for operational activation.' : 'Complete the items below before activation.'} Service areas: {readiness.serviceAreaCount}. Simulated callback: {readiness.paymentTestPassed ? 'passed' : 'not passed'}.</p>
			{#if readiness.blockers.length}<ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-200">{#each readiness.blockers as blocker}<li>{blocker}</li>{/each}</ul>{/if}
			<p class="mt-3 text-sm text-amber-200">Real payment collection is disabled. A simulated callback only verifies local configuration; it is not a GCash approval or settlement.</p>
		{/if}
	</section>
	{#if errorMessage}<div
			role="alert"
			class="mb-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200"
		>
			{errorMessage}
		</div>{/if}{#if successMessage}<div
			role="status"
			class="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200"
		>
			{successMessage}
		</div>{/if}
	<div class="grid gap-6 xl:grid-cols-[1fr_360px]">
		<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
			<h2 class="text-lg font-bold">Organization profile</h2>
			<fieldset disabled={!canManage} class="mt-5 grid gap-5 disabled:opacity-70 md:grid-cols-2">
				<label class="text-sm font-semibold"
					>Legal name<input class="field" bind:value={legalName} /></label
				><label class="text-sm font-semibold"
					>Display name<input class="field" bind:value={displayName} /></label
				><label class="text-sm font-semibold"
					>Utility type<input class="field" bind:value={utilityType} /></label
				><label class="text-sm font-semibold"
					>Contact name<input class="field" bind:value={primaryContactName} /></label
				><label class="text-sm font-semibold"
					>Contact email<input class="field" type="email" bind:value={primaryContactEmail} /></label
				><label class="text-sm font-semibold"
					>Contact phone<input class="field" bind:value={primaryContactPhone} /></label
				><label class="text-sm font-semibold">Region<input class="field" bind:value={region} /></label
				><label class="text-sm font-semibold">Province<input class="field" bind:value={province} /></label
				><label class="text-sm font-semibold">City / municipality<input class="field" bind:value={city} /></label
				><label class="text-sm font-semibold">Authority reference<input class="field" bind:value={authorityReference} /></label
				><label class="text-sm font-semibold">Estimated customer accounts<input class="field" type="number" min="0" bind:value={estimatedAccounts} /></label
				><label class="text-sm font-semibold md:col-span-2"
					>Office address<textarea class="field min-h-24" bind:value={officeAddress}
					></textarea></label
				>
				<fieldset class="md:col-span-2">
					<legend class="text-sm font-semibold">Enabled modules</legend>
					<div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						{#each modules as module}<label
								class="flex gap-2 rounded-lg border border-slate-700 p-3 text-sm capitalize"
								><input type="checkbox" bind:group={enabledModules} value={module} />{module}</label
							>{/each}
					</div>
				</fieldset>
			</fieldset>
			{#if canManage}
				{#if removedModules.length}<p
						class="mt-5 rounded-xl border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200"
					>
						Disabling {removedModules.join(', ')} may hide operational functions for this utility. Existing
						records remain stored.
					</p>{/if}
				<label class="mt-5 block text-sm font-semibold"
					>Reason for profile changes<textarea
						class="field min-h-20"
						bind:value={profileReason}
						placeholder="Required for the audit trail"></textarea></label
				>
				<button
					class="mt-6 rounded-xl bg-cyan-600 px-5 py-2.5 font-bold disabled:opacity-50"
					onclick={save}
					disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button
				>
			{/if}
		</section>
		<div class="space-y-6">
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="font-bold">Persisted usage and limits</h2>
				<p class="mt-2 text-sm text-slate-400">Warnings begin at 80% of a configured limit. Storage remains unmeasured until a storage provider reports usage.</p>
				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					{#each usage?.metrics ?? [] as metric}
						<article class="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
							<div class="flex items-center justify-between gap-3"><h3 class="text-sm font-semibold">{metric.label}</h3><span class={`rounded-full px-2 py-1 text-[10px] font-semibold ${metric.state==='Exceeded'?'bg-rose-950 text-rose-200':metric.state==='Warning'?'bg-amber-950 text-amber-200':'bg-slate-800 text-slate-300'}`}>{metric.state}</span></div>
							<p class="mt-3 text-2xl font-bold">{metric.measured ? metric.current?.toLocaleString() : 'Not available'}{#if metric.limit > 0}<span class="text-sm font-normal text-slate-500"> / {metric.limit.toLocaleString()} {metric.unit}</span>{/if}</p>
						</article>
					{/each}
				</div>
			</section>
			{#if page.data.platformSession?.role === 'finance-admin' && utility.status === 'Active'}
				<section class="rounded-2xl border border-amber-700 bg-amber-950/20 p-6">
					<h2 class="font-bold">Finance-confirmed suspension</h2>
					<p class="mt-2 text-sm text-amber-100">Use this only after reviewing payments whose settlement cannot be confirmed. Suspending does not settle or reverse them.</p>
					<label class="mt-4 block text-sm">Decision reason<textarea class="field min-h-20" bind:value={financeReason} maxlength="500"></textarea></label>
					<label class="mt-3 block text-sm">Your authenticator or unused recovery code<input class="field" type="password" autocomplete="one-time-code" bind:value={financeCode} /></label>
					{#if confirmingFinance}<p class="mt-3 text-sm text-amber-200">Confirm suspension of {utility.displayName} despite unconfirmed settlement evidence.</p><div class="mt-3 flex gap-2"><button class="rounded bg-amber-600 px-4 py-2 font-semibold disabled:opacity-50" onclick={financeSuspend} disabled={saving}>Confirm suspension</button><button class="rounded border border-slate-700 px-4 py-2" onclick={() => confirmingFinance = false}>Cancel</button></div>{:else}<button class="mt-4 rounded border border-amber-700 px-4 py-2 text-amber-200 disabled:opacity-50" disabled={saving || !financeReason.trim() || !financeCode.trim()} onclick={() => confirmingFinance = true}>Review finance suspension</button>{/if}
				</section>
			{/if}
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="font-bold">Service areas</h2>
				{#if serviceAreas.length}<ul class="mt-3 space-y-2 text-sm">{#each serviceAreas as area (area.id)}<li class="border-b border-slate-800 pb-2"><strong>{area.name}</strong>{#if area.description}<span class="ml-2 text-slate-400">{area.description}</span>{/if}</li>{/each}</ul>{:else}<p class="mt-3 text-sm text-amber-200">No service areas yet. Activation requires at least one.</p>{/if}
				{#if canManage}<label class="mt-4 block text-sm">New area name<input class="field" bind:value={newAreaName} maxlength="191" /></label>
					<label class="mt-3 block text-sm">Description (optional)<input class="field" bind:value={newAreaDescription} maxlength="500" /></label>
					<button class="mt-4 rounded-xl border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-200 disabled:opacity-50" onclick={addArea} disabled={saving || !newAreaName.trim()}>Add service area</button>{/if}
			</section>
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="font-bold">Onboarding documents</h2>
				<p class="mt-2 text-sm text-slate-400">A reviewed legal-authority document is required for activation. Files use local development storage; malware scanning is not connected.</p>
				{#if documents.length}<div class="mt-4 space-y-3">{#each documents as item (item.id)}
					<article class="rounded-xl border border-slate-800 p-4 text-sm">
						<div class="flex flex-wrap items-start justify-between gap-2"><div><strong>{item.originalFileName}</strong><p class="text-xs text-slate-400">{item.category.replaceAll('_', ' ')} · {(item.byteSize / 1024).toFixed(1)} KB · {item.scannerStatus}</p></div><span class="rounded-full bg-slate-800 px-2 py-1 text-xs">{item.status}</span></div>
						{#if item.rejectionReason}<p class="mt-2 text-rose-200">Reason: {item.rejectionReason}</p>{/if}
						<div class="mt-3 flex flex-wrap gap-2"><button class="rounded border border-slate-700 px-3 py-1.5" onclick={() => downloadDocument(item)}>Download</button>
							{#if canManage && item.status === 'Draft'}<button class="rounded border border-cyan-700 px-3 py-1.5 text-cyan-200" disabled={saving} onclick={() => submitDocument(item.id)}>Submit for review</button>{/if}
							{#if canManage && item.status !== 'Replaced'}<button class="rounded border border-slate-700 px-3 py-1.5" onclick={() => { documentReplaceId = item.id; documentCategory = item.category; }}>Replace</button>{/if}
						</div>
						{#if canManage && item.status === 'Submitted'}<label class="mt-3 block text-xs">Rejection reason<textarea class="field min-h-16" value={documentRejectReasons[item.id] ?? ''} oninput={(event) => documentRejectReasons = {...documentRejectReasons, [item.id]: event.currentTarget.value}}></textarea></label><div class="mt-2 flex gap-2"><button class="rounded bg-emerald-700 px-3 py-1.5" disabled={saving} onclick={() => reviewDocument(item.id, 'Accepted')}>Accept</button><button class="rounded bg-rose-800 px-3 py-1.5" disabled={saving} onclick={() => reviewDocument(item.id, 'Rejected')}>Reject</button></div>{/if}
					</article>
				{/each}</div>{:else}<p class="mt-4 text-sm text-amber-200">No onboarding documents uploaded.</p>{/if}
				{#if canManage}<div class="mt-5 grid gap-3">{#if documentReplaceId}<p class="rounded-lg border border-amber-800 bg-amber-950/20 p-3 text-sm text-amber-200">Replacing document #{documentReplaceId}. The prior version remains in history as Replaced. <button class="underline" type="button" onclick={() => documentReplaceId = undefined}>Cancel</button></p>{/if}<label class="text-sm font-semibold">Category<select class="field" bind:value={documentCategory}><option value="legal_authority">Legal authority</option><option value="service_area_evidence">Service-area evidence</option><option value="payment_onboarding">Payment onboarding</option><option value="other">Other</option></select></label><label class="text-sm font-semibold">PDF, PNG, or JPEG<input class="field" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onchange={(event) => documentFile = event.currentTarget.files?.[0] ?? null} /></label><button class="rounded-xl border border-cyan-700 px-4 py-2 font-semibold text-cyan-200 disabled:opacity-50" disabled={saving || !documentFile} onclick={uploadDocument}>{documentReplaceId ? 'Upload replacement draft' : 'Upload draft'}</button></div>{/if}
			</section>
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="font-bold">Starter tariff import</h2>
				<p class="mt-2 text-sm text-slate-400">Validate a CSV or XLSX file before creating a tenant-owned draft. Import never approves or publishes a tariff.</p>
				<div class="mt-3 flex gap-2"><button class="rounded border border-slate-700 px-3 py-1.5 text-sm" onclick={() => downloadTariffTemplate('csv')}>CSV template</button><button class="rounded border border-slate-700 px-3 py-1.5 text-sm" onclick={() => downloadTariffTemplate('xlsx')}>XLSX template</button></div>
				{#if canManage}<div class="mt-4 grid gap-3"><label class="text-sm font-semibold">Import file<input class="field" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onchange={(event) => { tariffFile = event.currentTarget.files?.[0] ?? null; tariffValidation = null; }} /></label><label class="text-sm font-semibold">Worksheet (optional)<input class="field" bind:value={tariffWorksheet} /></label><button class="rounded-xl border border-cyan-700 px-4 py-2 font-semibold text-cyan-200 disabled:opacity-50" disabled={saving || !tariffFile} onclick={validateTariff}>Validate import</button></div>{/if}
				{#if tariffValidation}<div class="mt-4 rounded-xl border border-slate-700 p-4 text-sm"><p><strong>{tariffValidation.validCount}</strong> valid rows · <strong>{tariffValidation.errorCount}</strong> errors</p>{#if tariffValidation.simulation}<p class="mt-2 text-slate-300">Deterministic preview at {tariffValidation.simulation.consumption} m³: PHP {tariffValidation.simulation.total}</p>{/if}{#if tariffValidation.errors.length}<ul class="mt-2 list-disc pl-5 text-rose-200">{#each tariffValidation.errors.slice(0, 10) as issue}<li>Row {issue.row}, {issue.field}: {issue.message}</li>{/each}</ul>{/if}{#if tariffValidation.errorCount === 0}<button class="mt-3 rounded bg-cyan-600 px-4 py-2 font-semibold disabled:opacity-50" disabled={saving} onclick={commitTariff}>Create tariff draft</button>{/if}</div>{/if}
				{#if tariffHistory.length}<ul class="mt-4 space-y-2 text-xs text-slate-400">{#each tariffHistory as batch (batch.id)}<li>{batch.fileName} · {batch.status} · {new Date(batch.createdAt).toLocaleString()}</li>{/each}</ul>{/if}
			</section>
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="font-bold">Tenant settings</h2>
				<p class="mt-2 text-sm text-slate-400">
					These values belong to the inspected utility, not your platform account.
				</p>
				<div class="mt-4 grid gap-4">
					<label class="text-sm font-semibold"
						>Currency<input class="field" value={currency} disabled /></label
					><label class="text-sm font-semibold"
						>Timezone<input
							class="field"
							bind:value={timezone}
							disabled={!canManage}
							placeholder="Asia/Manila"
						/></label
					><label class="text-sm font-semibold"
						>Maximum customer accounts<input class="field" type="number" min="1" max="10000000" bind:value={maximumAccounts} disabled={!canManage} /></label
					><label class="text-sm font-semibold"
						>Billing cycles retained<input class="field" type="number" min="1" max="120" bind:value={billingCycleLimit} disabled={!canManage} /></label
					><label class="text-sm font-semibold"
						>Storage allocation (GB)<input class="field" type="number" min="1" max="10000" bind:value={storageLimitGb} disabled={!canManage} /></label
					><label class="text-sm font-semibold"
						>Service level<select class="field" bind:value={slaTier} disabled={!canManage}><option>Standard</option><option>Priority</option><option>Enterprise</option></select></label
					><label class="text-sm font-semibold"
						>Assigned platform owner<input class="field" bind:value={assignedOwner} maxlength="191" disabled={!canManage} placeholder="Unassigned" /></label
					>{#if canManage}<label class="text-sm font-semibold"
							>Change reason<textarea class="field min-h-20" bind:value={settingsReason}
							></textarea></label
						><button
							class="rounded-xl border border-cyan-700 px-4 py-2 font-semibold text-cyan-200 disabled:opacity-50"
							onclick={saveSettings}
							disabled={saving}>Save tenant settings</button
						>{/if}
				</div>
			</section>
			{#if canManage}<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
					<h2 class="font-bold">Lifecycle control</h2>
					{#if nextStatus === 'Active' && !readiness?.ready}<p class="mt-3 text-sm text-amber-200">Activation is blocked until the readiness items above are complete.</p>{/if}
					<label class="mt-4 block text-sm font-semibold"
						>New status<select class="field" bind:value={nextStatus}
							><option>Active</option><option>Onboarding</option><option>Suspended</option><option
								>Migration Review</option
							></select
						></label
					><label class="mt-4 block text-sm font-semibold"
						>Reason<textarea
							class="field min-h-20"
							bind:value={reason}
							placeholder="Required for the audit trail"></textarea></label
					>{#if confirmingStatus}<p
							class="mt-4 rounded-xl border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200"
						>
							Confirm {nextStatus.toLowerCase()} for {utility.displayName}. This affects utility access. Operational activation keeps real payments disabled. Suspension is blocked when payment records lack settlement confirmation.
						</p>
						<div class="mt-3 flex gap-2">
							<button
								class="rounded-xl bg-amber-600 px-4 py-2 font-semibold"
								onclick={changeStatus}
								disabled={saving}>Confirm change</button
							><button
								class="rounded-xl border border-slate-700 px-4 py-2"
								onclick={() => (confirmingStatus = false)}>Cancel</button
							>
						</div>{:else}<button
							class="mt-4 w-full rounded-xl border border-amber-700 px-4 py-2 font-semibold text-amber-200 disabled:opacity-50"
							onclick={() => {
								if (!reason.trim()) errorMessage = 'A reason is required for status changes.';
								else confirmingStatus = true;
							}}
							disabled={saving || nextStatus === utility.status || (nextStatus === 'Active' && !readiness?.ready)}>Review status change</button
						>
					{/if}
				</section>{/if}
			<section class="rounded-2xl border border-slate-800 bg-slate-900">
				<h2 class="border-b border-slate-800 p-5 font-bold">Utility audit</h2>
				{#if audit.length}{#each audit as entry}<div
							class="border-b border-slate-800 p-5 last:border-0"
						>
							<p class="text-sm font-semibold">{entry.action}</p>
							<p class="mt-1 text-xs text-slate-500">
								{entry.actor} · {new Date(entry.createdAt).toLocaleString()}
							</p>
						</div>{/each}{:else}<p class="p-5 text-sm text-slate-400">
						No platform events for this utility.
					</p>{/if}
			</section>
		</div>
	</div>
{/if}
</div>
