<script lang="ts">
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type {
		PlatformReportRecipient,
		PlatformReportResult,
		PlatformReportSchedule
	} from '$lib/platform/types';

	type ReportQuery = {
		type: PlatformReportResult['type'];
		from: string;
		until: string;
		tenantId: string;
	};
	const today = new Date().toISOString().slice(0, 10);
	let type = $state<ReportQuery['type']>('active_accounts');
	let from = $state(today.slice(0, 7) + '-01');
	let until = $state(today);
	let tenantId = $state('');
	let applied = $state<ReportQuery | null>(null);
	let result = $state<PlatformReportResult | null>(null);
	let loading = $state(true);
	let exporting = $state(false);
	let exportFormat = $state<'csv' | 'xlsx' | 'pdf'>('csv');
	let exportReason = $state('');
	let errorMessage = $state('');
	let successMessage = $state('');
	let schedules = $state<PlatformReportSchedule[]>([]);
	let scheduleFormat = $state<'csv' | 'xlsx' | 'pdf'>('csv');
	let frequency = $state<'daily' | 'weekly' | 'monthly'>('weekly');
	let nextRunAt = $state('');
	let currentUserId = $state(0);
	let editingScheduleId = $state<number | null>(null);
	let recipients = $state<PlatformReportRecipient[]>([]);
	let selectedRecipientIds = $state<number[]>([]);

	async function loadRecipients(reportType: ReportQuery['type']) {
		recipients = await platformService.reportRecipients(reportType);
		selectedRecipientIds = selectedRecipientIds.filter((id) =>
			recipients.some((user) => user.id === id)
		);
	}
	async function changeReportType(event: Event) {
		type = (event.currentTarget as HTMLSelectElement).value as ReportQuery['type'];
		selectedRecipientIds = [];
		await loadRecipients(type);
	}
	function toggleRecipient(id: number) {
		selectedRecipientIds = selectedRecipientIds.includes(id)
			? selectedRecipientIds.filter((value) => value !== id)
			: [...selectedRecipientIds, id];
	}

	async function preview(event?: SubmitEvent) {
		event?.preventDefault();
		loading = true;
		errorMessage = '';
		successMessage = '';
		result = null;
		const query = { type, from, until, tenantId: tenantId.trim() };
		try {
			result = await platformService.report(query);
			applied = query;
		} catch (error) {
			applied = null;
			errorMessage = error instanceof Error ? error.message : 'Unable to generate report.';
		} finally {
			loading = false;
		}
	}

	async function exportReport() {
		if (!applied) return;
		exporting = true;
		errorMessage = '';
		successMessage = '';
		try {
			const file = await platformService.exportReport({
				...applied,
				format: exportFormat,
				reason: exportReason.trim()
			});
			const url = URL.createObjectURL(file.blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = file.fileName;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			successMessage = `Exported ${file.count} rows; the export was audited.`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to export report.';
		} finally {
			exporting = false;
		}
	}

	async function createSchedule(event: SubmitEvent) {
		event.preventDefault();
		exporting = true;
		errorMessage = '';
		successMessage = '';
		try {
			const input = {
				reportType: type,
				filters: { from, until, tenantId: tenantId.trim() },
				format: scheduleFormat,
				recipientIds: selectedRecipientIds,
				frequency,
				timezone: 'Asia/Manila',
				nextRunAt: new Date(nextRunAt).toISOString()
			};
			if (editingScheduleId) await platformService.updateReportSchedule(editingScheduleId, input);
			else await platformService.createReportSchedule(input);
			schedules = await platformService.reportSchedules();
			editingScheduleId = null;
			successMessage =
				'Schedule saved. Artifact delivery remains unavailable until a provider is configured.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to create report schedule.';
		} finally {
			exporting = false;
		}
	}
	async function editSchedule(schedule: PlatformReportSchedule) {
		let filters: { from?: string; until?: string; tenantId?: string } = {};
		try {
			filters = JSON.parse(schedule.filtersJson) as typeof filters;
		} catch {
			/* Keep empty filters for legacy schedules. */
		}
		editingScheduleId = schedule.id;
		type = schedule.reportType as ReportQuery['type'];
		await loadRecipients(type);
		try {
			selectedRecipientIds = JSON.parse(schedule.recipientIdsJson) as number[];
		} catch {
			selectedRecipientIds = [];
		}
		from = filters.from ?? '';
		until = filters.until ?? '';
		tenantId = filters.tenantId ?? '';
		scheduleFormat = schedule.format;
		frequency = schedule.frequency;
		nextRunAt = new Date(schedule.nextRunAt).toISOString().slice(0, 16);
	}
	function hasRetry(schedule: PlatformReportSchedule, runId: number) {
		return schedule.runs.some((candidate) => candidate.originalRunId === runId);
	}
	async function retryRun(scheduleId: number, runId: number) {
		exporting = true;
		errorMessage = '';
		try {
			await platformService.retryReportRun(scheduleId, runId);
			schedules = await platformService.reportSchedules();
			successMessage = 'Retry completed. Delivery remains unavailable.';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to retry the report run.';
		} finally {
			exporting = false;
		}
	}
	async function scheduleAction(id: number, action: 'pause' | 'resume' | 'archive' | 'run') {
		if (action === 'archive' && !confirm('Archive this report schedule?')) return;
		exporting = true;
		errorMessage = '';
		try {
			await platformService.reportScheduleAction(id, action);
			schedules = await platformService.reportSchedules();
			successMessage =
				action === 'run'
					? 'Artifact generated locally. Delivery unavailable.'
					: `Schedule ${action}d.`;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Unable to update the report schedule.';
		} finally {
			exporting = false;
		}
	}

	onMount(async () => {
		try {
			const [session, values] = await Promise.all([
				platformService.session(),
				platformService.reportSchedules()
			]);
			currentUserId = session.userId;
			schedules = values;
			await loadRecipients(type);
			if (recipients.some((recipient) => recipient.id === currentUserId))
				selectedRecipientIds = [currentUserId];
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load report schedules.';
		}
		await preview();
	});
</script>

<svelte:head><title>Platform reports | Water Assistant System</title></svelte:head>
<header class="mb-6">
	<p class="text-xs font-bold tracking-[.2em] text-cyan-400 uppercase">Analytics</p>
	<h1 class="mt-2 text-3xl font-bold">Platform reports</h1>
	<p class="mt-2 text-sm text-slate-400">
		Preview and export reports backed by tenant, account, and billing records.
	</p>
</header>

<div class="mb-6 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-100">
	GMV, recurring revenue, digital-payment conversion, regional rollout, and provider error trends
	are unavailable until verified financial, location, and telemetry sources exist. Scheduled
	delivery is not connected.
</div>

<form
	onsubmit={preview}
	class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4"
>
	<label class="text-sm"
		>Report<select
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2"
			value={type}
			onchange={changeReportType}
			><option value="utility_adoption">Utility adoption</option><option value="active_accounts"
				>Active accounts</option
			><option value="billing_records">Billing records created</option></select
		></label
	>
	<label class="text-sm"
		>From (UTC)<input
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2"
			type="date"
			bind:value={from}
			disabled={type === 'active_accounts'}
			required={type !== 'active_accounts'}
		/></label
	>
	<label class="text-sm"
		>Through (UTC)<input
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2"
			type="date"
			bind:value={until}
			disabled={type === 'active_accounts'}
			required={type !== 'active_accounts'}
		/></label
	>
	<label class="text-sm"
		>Utility ID (optional)<input
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2"
			type="text"
			inputmode="numeric"
			bind:value={tenantId}
		/></label
	>
	<button
		class="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-4"
		disabled={loading}>Generate preview</button
	>
</form>

{#if errorMessage}<p
		role="alert"
		class="mt-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200"
	>
		{errorMessage}
	</p>{/if}
{#if successMessage}<p
		role="status"
		class="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200"
	>
		{successMessage}
	</p>{/if}
{#if loading}<p role="status" class="mt-6 rounded-xl border border-slate-800 p-6">
		Generating report…
	</p>{:else if result}
	<section class="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
		<div class="flex flex-wrap justify-between gap-3">
			<div>
				<h2 class="text-lg font-bold">Preview · {result.total} total</h2>
				<p class="mt-1 text-sm text-slate-400">{result.basis}</p>
				<p class="mt-1 text-xs text-slate-500">
					Generated {new Date(result.generatedAt).toLocaleString()}
				</p>
			</div>
			<div class="flex flex-wrap items-end gap-2">
				<label class="text-xs text-slate-400"
					>Format<select
						class="mt-1 block rounded-lg border border-slate-700 bg-slate-800 p-2 text-sm text-white"
						bind:value={exportFormat}
						><option value="csv">CSV</option><option value="xlsx">XLSX</option><option value="pdf"
							>PDF</option
						></select
					></label
				>{#if applied?.type === 'billing_records'}<label class="text-xs text-slate-400"
						>Export reason<input
							class="mt-1 block rounded-lg border border-slate-700 bg-slate-800 p-2 text-sm text-white"
							required
							minlength="10"
							bind:value={exportReason}
						/></label
					>{/if}<button
					class="h-fit rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50"
					disabled={exporting ||
						result.rows.length === 0 ||
						(applied?.type === 'billing_records' && exportReason.trim().length < 10)}
					onclick={exportReport}
					>{exporting ? 'Preparing…' : `Export ${exportFormat.toUpperCase()}`}</button
				>
			</div>
		</div>
		{#if result.rows.length === 0}<p class="mt-5 text-sm text-slate-400">
				No matching utility records.
			</p>{:else}<div class="mt-5 overflow-x-auto">
				<table class="w-full min-w-[420px] text-left text-sm">
					<thead class="border-b border-slate-700 text-slate-400"
						><tr><th class="p-3">Utility</th><th class="p-3">Count</th></tr></thead
					><tbody
						>{#each result.rows as row (row.utilityId)}<tr
								class="border-b border-slate-800 last:border-0"
								><td class="p-3"
									><a
										class="text-cyan-300 underline"
										href={`/super-admin/utilities/${row.utilityId}`}
										>{row.utilityName} (#{row.utilityId})</a
									></td
								><td class="p-3">{row.count}</td></tr
							>{/each}</tbody
					>
				</table>
			</div>{/if}
	</section>
{/if}

<form onsubmit={createSchedule} class="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
	<h2 class="font-semibold text-white">
		{editingScheduleId ? 'Edit report schedule' : 'Schedule this report'}
	</h2>
	<p class="mt-1 text-sm text-amber-200">
		Artifacts are generated locally. Email delivery is unavailable until a provider confirms
		delivery.
	</p>
	<div class="mt-4 grid gap-3 md:grid-cols-4">
		<label class="text-xs text-slate-400"
			>Format<select
				bind:value={scheduleFormat}
				class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2"
				><option value="csv">CSV</option><option value="xlsx">XLSX</option><option value="pdf"
					>PDF</option
				></select
			></label
		><label class="text-xs text-slate-400"
			>Frequency<select
				bind:value={frequency}
				class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2"
				><option value="daily">Daily</option><option value="weekly">Weekly</option><option
					value="monthly">Monthly</option
				></select
			></label
		><label class="text-xs text-slate-400 md:col-span-2"
			>Next run (Asia/Manila)<input
				required
				type="datetime-local"
				bind:value={nextRunAt}
				class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2"
			/></label
		>
	</div>
	<fieldset class="mt-4 rounded-lg border border-slate-700 p-4">
		<legend class="px-1 text-sm font-semibold text-white">Recipients</legend>
		<p class="mb-3 text-xs text-slate-400">
			Select active platform users who are permitted to receive this report.
		</p>
		{#if recipients.length === 0}
			<p class="text-sm text-amber-200">No eligible platform recipients are available.</p>
		{:else}
			<div class="grid gap-2 md:grid-cols-2">
				{#each recipients as recipient (recipient.id)}
					<label
						class="flex items-start gap-3 rounded-lg border border-slate-700 p-3 text-sm text-slate-200"
						><input
							type="checkbox"
							class="mt-1"
							checked={selectedRecipientIds.includes(recipient.id)}
							onchange={() => toggleRecipient(recipient.id)}
						/><span
							><span class="block font-medium text-white">{recipient.fullName}</span><span
								class="block text-xs text-slate-400"
								>{recipient.role} · {recipient.emailMasked}</span
							></span
						></label
					>
				{/each}
			</div>
		{/if}
	</fieldset>
	<div class="mt-4 flex gap-2">
		<button
			disabled={exporting || !nextRunAt || currentUserId === 0 || selectedRecipientIds.length === 0}
			class="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
			>{editingScheduleId ? 'Save changes' : 'Create schedule for me'}</button
		>
		{#if editingScheduleId}
			<button
				type="button"
				class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
				onclick={() => (editingScheduleId = null)}>Cancel</button
			>
		{/if}
	</div>
</form>

<section class="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
	<h2 class="font-semibold text-white">Saved schedules</h2>
	{#if schedules.length === 0}<p class="mt-3 text-sm text-slate-400">
			No report schedules.
		</p>{:else}<div class="mt-4 space-y-3">
			{#each schedules as schedule}<article class="rounded-lg border border-slate-700 p-4">
					<div class="flex flex-wrap justify-between gap-3">
						<div>
							<p class="font-medium text-white">
								{schedule.reportType} · {schedule.format.toUpperCase()}
							</p>
							<p class="mt-1 text-xs text-slate-400">
								{schedule.frequency} · next {new Date(schedule.nextRunAt).toLocaleString()}
							</p>
						</div>
						<span class="text-sm text-cyan-300">{schedule.status}</span>
					</div>
					<div class="mt-3 flex flex-wrap gap-2">
						<button
							type="button"
							disabled={exporting || schedule.status === 'Archived'}
							onclick={() => void editSchedule(schedule)}
							class="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 disabled:opacity-40"
							>Edit</button
						>
						<button
							type="button"
							disabled={exporting || schedule.status !== 'Active'}
							onclick={() => scheduleAction(schedule.id, 'run')}
							class="rounded-lg border border-cyan-700 px-3 py-2 text-xs text-cyan-200 disabled:opacity-40"
							>Generate now</button
						><button
							type="button"
							disabled={exporting || (schedule.status !== 'Active' && schedule.status !== 'Paused')}
							onclick={() =>
								scheduleAction(schedule.id, schedule.status === 'Paused' ? 'resume' : 'pause')}
							class="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200"
							>{schedule.status === 'Paused' ? 'Resume' : 'Pause'}</button
						><button
							type="button"
							disabled={exporting}
							onclick={() => scheduleAction(schedule.id, 'archive')}
							class="rounded-lg border border-rose-800 px-3 py-2 text-xs text-rose-200"
							>Archive</button
						>
					</div>
					{#if schedule.runs?.length}
						<div class="mt-4 overflow-x-auto">
							<table class="w-full min-w-[620px] text-left text-xs">
								<thead class="text-slate-500"
									><tr
										><th class="p-2">Attempt</th><th class="p-2">Status</th><th class="p-2"
											>Created</th
										><th class="p-2">Artifact</th><th class="p-2">Delivery</th><th class="p-2"
											>Action</th
										></tr
									></thead
								><tbody
									>{#each schedule.runs as run (run.id)}<tr class="border-t border-slate-800"
											><td class="p-2">{run.attemptNumber || 1}</td><td class="p-2"
												><span
													class={run.status === 'Failed' ? 'text-rose-300' : 'text-emerald-300'}
													>{run.status}</span
												>{#if run.errorMessage}<span class="mt-1 block max-w-sm text-slate-400"
														>{run.errorMessage}</span
													>{/if}</td
											><td class="p-2">{new Date(run.createdAt).toLocaleString()}</td><td
												class="p-2">{run.artifactName ?? 'Not generated'}</td
											><td class="p-2 text-amber-200">{run.deliveryStatus}</td><td class="p-2"
												>{#if run.status === 'Failed'}<button
														type="button"
														disabled={exporting || hasRetry(schedule, run.id)}
														onclick={() => retryRun(schedule.id, run.id)}
														class="rounded border border-cyan-700 px-2 py-1 text-cyan-200 disabled:opacity-40"
														>{hasRetry(schedule, run.id) ? 'Retry recorded' : 'Retry'}</button
													>{:else}<span class="text-slate-500">—</span>{/if}</td
											></tr
										>{/each}</tbody
								>
							</table>
						</div>
					{/if}
				</article>{/each}
		</div>{/if}
</section>
