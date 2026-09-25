<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformAuditEntry, PlatformUtility } from '$lib/platform/types';

	const utilityId = $derived(Number(page.params.id));
	let utility = $state<PlatformUtility | null>(null);
	let audit = $state<PlatformAuditEntry[]>([]);
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
	let enabledModules = $state<string[]>([]);
	let nextStatus = $state<PlatformUtility['status']>('Active');
	let reason = $state('');
	let profileReason = $state('');
	let currency = $state<'PHP'>('PHP');
	let timezone = $state('Asia/Manila');
	let settingsReason = $state('');
	let confirmingStatus = $state(false);
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
		'payments',
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
		enabledModules = value.enabledModules.split(',').filter(Boolean);
		nextStatus = value.status;
	}
	async function load() {
		loading = true;
		errorMessage = '';
		try {
			const [record, log, settings] = await Promise.all([
				platformService.utility(utilityId),
				platformService.audit({ tenantId: utilityId, pageSize: 10 }),
				platformService.utilitySettings(utilityId)
			]);
			populate(record);
			audit = log.items;
			currency = settings.currency;
			timezone = settings.timezone;
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
		saving = true;
		errorMessage = '';
		successMessage = '';
		try {
			const updated = await platformService.updateUtility(utilityId, {
				reason: profileReason,
				displayName,
				legalName,
				officeAddress,
				primaryContactName,
				primaryContactEmail,
				primaryContactPhone,
				utilityType,
				enabledModules
			});
			populate(updated);
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
				reason: settingsReason
			});
			currency = settings.currency;
			timezone = settings.timezone;
			settingsReason = '';
			successMessage = 'Tenant settings saved and audited.';
			await loadAudit();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to save tenant settings.';
		} finally {
			saving = false;
		}
	}
	onMount(load);
</script>

<svelte:head><title>{utility?.displayName ?? 'Utility'} | WAS Platform</title></svelte:head>
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
							Confirm {nextStatus.toLowerCase()} for {utility.displayName}. This affects utility
							access.
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
							disabled={saving || nextStatus === utility.status}>Review status change</button
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

<style>
	.field {
		margin-top: 0.5rem;
		width: 100%;
		border-radius: 0.75rem;
		border: 1px solid rgb(51 65 85);
		background: rgb(30 41 59);
		padding: 0.75rem 1rem;
		outline: none;
	}
	.field:focus {
		border-color: rgb(34 211 238);
	}
</style>
