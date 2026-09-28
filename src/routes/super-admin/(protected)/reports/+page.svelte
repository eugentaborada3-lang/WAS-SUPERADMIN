<script lang="ts">
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformReportResult } from '$lib/platform/types';

	type ReportQuery = { type: PlatformReportResult['type']; from: string; until: string; tenantId: string };
	const today = new Date().toISOString().slice(0, 10);
	let type = $state<ReportQuery['type']>('active_accounts');
	let from = $state(today.slice(0, 7) + '-01');
	let until = $state(today);
	let tenantId = $state('');
	let applied = $state<ReportQuery | null>(null);
	let result = $state<PlatformReportResult | null>(null);
	let loading = $state(true);
	let exporting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function preview(event?: SubmitEvent) {
		event?.preventDefault();
		loading = true; errorMessage = ''; successMessage = ''; result = null;
		const query = { type, from, until, tenantId: tenantId.trim() };
		try {
			result = await platformService.report(query);
			applied = query;
		} catch (error) {
			applied = null;
			errorMessage = error instanceof Error ? error.message : 'Unable to generate report.';
		} finally { loading = false; }
	}

	async function exportCSV() {
		if (!applied) return;
		exporting = true; errorMessage = ''; successMessage = '';
		try {
			const file = await platformService.exportReport(applied);
			const url = URL.createObjectURL(new Blob([file.csv], { type: 'text/csv;charset=utf-8' }));
			const link = document.createElement('a'); link.href = url; link.download = file.fileName; link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			successMessage = `Exported ${file.count} rows; the export was audited.`;
		} catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to export report.'; }
		finally { exporting = false; }
	}

	onMount(() => { void preview(); });
</script>

<svelte:head><title>Platform reports | Water Assistant System</title></svelte:head>
<header class="mb-6"><p class="text-xs font-bold tracking-[.2em] text-cyan-400 uppercase">Analytics</p><h1 class="mt-2 text-3xl font-bold">Platform reports</h1><p class="mt-2 text-sm text-slate-400">Preview and export reports backed by tenant, account, and billing records.</p></header>

<div class="mb-6 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-100">GMV, recurring revenue, digital-payment conversion, regional rollout, and provider error trends are unavailable until verified financial, location, and telemetry sources exist. PDF/XLSX and scheduled delivery are not connected.</div>

<form onsubmit={preview} class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-4">
	<label class="text-sm">Report<select class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={type}><option value="utility_adoption">Utility adoption</option><option value="active_accounts">Active accounts</option><option value="billing_records">Billing records created</option></select></label>
	<label class="text-sm">From (UTC)<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="date" bind:value={from} disabled={type === 'active_accounts'} required={type !== 'active_accounts'} /></label>
	<label class="text-sm">Through (UTC)<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="date" bind:value={until} disabled={type === 'active_accounts'} required={type !== 'active_accounts'} /></label>
	<label class="text-sm">Utility ID (optional)<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="text" inputmode="numeric" bind:value={tenantId} /></label>
	<button class="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-4" disabled={loading}>Generate preview</button>
</form>

{#if errorMessage}<p role="alert" class="mt-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">{errorMessage}</p>{/if}
{#if successMessage}<p role="status" class="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{successMessage}</p>{/if}
{#if loading}<p role="status" class="mt-6 rounded-xl border border-slate-800 p-6">Generating report…</p>{:else if result}
	<section class="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5"><div class="flex flex-wrap justify-between gap-3"><div><h2 class="text-lg font-bold">Preview · {result.total} total</h2><p class="mt-1 text-sm text-slate-400">{result.basis}</p><p class="mt-1 text-xs text-slate-500">Generated {new Date(result.generatedAt).toLocaleString()}</p></div><button class="h-fit rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50" disabled={exporting || result.rows.length === 0} onclick={exportCSV}>{exporting ? 'Preparing…' : 'Export CSV'}</button></div>
		{#if result.rows.length === 0}<p class="mt-5 text-sm text-slate-400">No matching utility records.</p>{:else}<div class="mt-5 overflow-x-auto"><table class="w-full min-w-[420px] text-left text-sm"><thead class="border-b border-slate-700 text-slate-400"><tr><th class="p-3">Utility</th><th class="p-3">Count</th></tr></thead><tbody>{#each result.rows as row (row.utilityId)}<tr class="border-b border-slate-800 last:border-0"><td class="p-3"><a class="text-cyan-300 underline" href={`/super-admin/utilities/${row.utilityId}`}>{row.utilityName} (#{row.utilityId})</a></td><td class="p-3">{row.count}</td></tr>{/each}</tbody></table></div>{/if}
	</section>
{/if}
