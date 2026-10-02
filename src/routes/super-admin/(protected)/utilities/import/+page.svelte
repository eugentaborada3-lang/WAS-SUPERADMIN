<script lang="ts">
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { UtilityImportBatch, UtilityImportValidation } from '$lib/platform/types';

	let file = $state<File | null>(null);
	let worksheet = $state('');
	let validation = $state<UtilityImportValidation | null>(null);
	let history = $state<UtilityImportBatch[]>([]);
	let busy = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	const canCommit = $derived(Boolean(file && validation?.status === 'Ready' && validation.errorCount === 0));

	async function loadHistory() {
		try { history = await platformService.utilityImportHistory(); }
		catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to load import history.'; }
	}
	async function downloadTemplate(format: 'csv' | 'xlsx') {
		try {
			const blob = await platformService.utilityImportTemplate(format);
			const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `utility-import-template.${format}`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
		} catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to download the template.'; }
	}
	async function validateFile() {
		if (!file) { errorMessage = 'Select a CSV or XLSX file.'; return; }
		if (file.name.toLowerCase().endsWith('.xlsx') && !worksheet.trim()) { errorMessage = 'Enter the XLSX worksheet name.'; return; }
		busy = true; errorMessage = ''; successMessage = ''; validation = null;
		try { validation = await platformService.validateUtilityImport(file, worksheet.trim()); successMessage = validation.status === 'Ready' ? 'Validation passed. Review the draft rows before committing.' : 'Validation found errors. Nothing was imported.'; await loadHistory(); }
		catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to validate the file.'; }
		finally { busy = false; }
	}
	function downloadErrors() {
		if (!validation?.errors.length) return;
		const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
		const csv = ['row,field,message', ...validation.errors.map((item) => [item.row, item.field, item.message].map(escape).join(','))].join('\r\n');
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
		const link = document.createElement('a'); link.href = url; link.download = `utility-import-${validation.batchId}-errors.csv`; link.click(); URL.revokeObjectURL(url);
	}
	async function commit() {
		if (!file || !validation || !canCommit) return;
		if (!confirm(`Create ${validation.validCount} onboarding drafts? No utility will be activated and no administrator will be created.`)) return;
		busy = true; errorMessage = ''; successMessage = '';
		try { await platformService.commitUtilityImport(validation.batchId, file); successMessage = 'Onboarding drafts created. Review each draft before submission and administrator invitation.'; validation = null; file = null; worksheet = ''; await loadHistory(); }
		catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to commit the import.'; }
		finally { busy = false; }
	}
	onMount(loadHistory);
</script>

<svelte:head><title>Import utilities | WAS Platform</title></svelte:head>
<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div><a class="text-sm text-cyan-400" href="/super-admin/utilities">← Utilities</a><p class="mt-4 text-xs font-bold tracking-[.2em] text-cyan-400">CONTROLLED ONBOARDING</p><h1 class="mt-2 text-3xl font-bold">Import utility drafts</h1><p class="mt-2 max-w-3xl text-sm text-slate-400">Validate CSV or XLSX records, then create inactive onboarding drafts. Imported records never activate utilities or create user accounts automatically.</p></div>
	<div class="flex gap-2"><button type="button" class="rounded-xl border border-slate-700 px-4 py-3 text-sm" onclick={() => downloadTemplate('csv')}>CSV template</button><button type="button" class="rounded-xl border border-slate-700 px-4 py-3 text-sm" onclick={() => downloadTemplate('xlsx')}>XLSX template</button></div>
</header>
{#if errorMessage}<p role="alert" class="mb-4 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">{errorMessage}</p>{/if}
{#if successMessage}<p role="status" class="mb-4 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{successMessage}</p>{/if}
<section class="rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="upload-heading">
	<h2 id="upload-heading" class="text-lg font-bold">1. Select and validate</h2>
	<div class="mt-4 grid gap-4 md:grid-cols-2"><label class="text-sm text-slate-300">CSV or XLSX file<input class="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 p-3" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onchange={(event) => { file = event.currentTarget.files?.[0] ?? null; validation = null; }} /></label><label class="text-sm text-slate-300">Worksheet name <span class="text-slate-500">(XLSX only)</span><input class="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-950 p-3" bind:value={worksheet} placeholder="Sheet1" /></label></div>
	<button type="button" class="mt-4 rounded-xl bg-cyan-600 px-5 py-3 font-bold disabled:opacity-50" disabled={busy || !file} onclick={validateFile}>{busy ? 'Validating…' : 'Validate file'}</button>
</section>
{#if validation}
	<section class="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="review-heading"><div class="flex flex-wrap items-center justify-between gap-3"><div><h2 id="review-heading" class="text-lg font-bold">2. Review validation</h2><p class="mt-1 text-sm text-slate-400">{validation.rowCount} rows · {validation.validCount} valid · {validation.errorCount} errors</p></div><span class="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold">{validation.status}</span></div>
		{#if validation.errors.length}<button type="button" class="mt-4 rounded-lg border border-rose-700 px-3 py-2 text-sm text-rose-200" onclick={downloadErrors}>Download error report</button><div class="mt-3 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="text-slate-400"><tr><th class="p-2">Row</th><th class="p-2">Field</th><th class="p-2">Issue</th></tr></thead><tbody>{#each validation.errors as issue}<tr class="border-t border-slate-800"><td class="p-2">{issue.row}</td><td class="p-2">{issue.field}</td><td class="p-2 text-rose-200">{issue.message}</td></tr>{/each}</tbody></table></div>{:else}<div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm"><thead class="text-slate-400"><tr><th class="p-2">Utility</th><th class="p-2">Slug</th><th class="p-2">Region</th><th class="p-2">Areas</th><th class="p-2">Estimated accounts</th></tr></thead><tbody>{#each validation.preview as item}<tr class="border-t border-slate-800"><td class="p-2">{item.displayName}</td><td class="p-2">{item.slug}</td><td class="p-2">{item.region}</td><td class="p-2">{item.serviceAreaCount}</td><td class="p-2">{item.estimatedAccounts.toLocaleString()}</td></tr>{/each}</tbody></table></div>{/if}
		<button type="button" class="mt-5 rounded-xl bg-cyan-600 px-5 py-3 font-bold disabled:opacity-50" disabled={busy || !canCommit} onclick={commit}>Create onboarding drafts</button>
	</section>
{/if}
<section class="mt-6" aria-labelledby="history-heading"><h2 id="history-heading" class="mb-3 text-lg font-bold">Import history</h2>{#if history.length}<div class="overflow-x-auto rounded-2xl border border-slate-800"><table class="w-full text-left text-sm"><thead class="bg-slate-900 text-slate-400"><tr><th class="p-3">File</th><th class="p-3">Status</th><th class="p-3">Rows</th><th class="p-3">Created</th></tr></thead><tbody>{#each history as batch}<tr class="border-t border-slate-800"><td class="p-3">{batch.fileName}</td><td class="p-3">{batch.status}</td><td class="p-3">{batch.validCount}/{batch.rowCount}</td><td class="p-3">{new Date(batch.createdAt).toLocaleString()}</td></tr>{/each}</tbody></table></div>{:else}<StatePanel title="No utility imports yet" message="Validated imports will appear here." />{/if}</section>
