<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformAuditEntry, PlatformPage } from '$lib/platform/types';
	let result = $state<PlatformPage<PlatformAuditEntry> | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');
	let search = $state('');
	let resourceType = $state('');
	let action = $state('');
	let actor = $state('');
	let from = $state('');
	let until = $state('');
	let pageNumber = $state(1);
	let exportReason = $state('');
	let exporting = $state(false);
	let exportNotice = $state('');
	async function load() {
		loading = true;
		errorMessage = '';
		try {
			result = await platformService.audit({
				search,
				resourceType,
				action,
				actor,
				from,
				until,
				page: pageNumber,
				pageSize: 25
			});
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to load audit logs.';
		} finally {
			loading = false;
		}
	}
	function apply(event: SubmitEvent) {
		event.preventDefault();
		pageNumber = 1;
		load();
	}
	async function exportEvidence() {
		exporting = true; errorMessage = ''; exportNotice = '';
		try {
			const result = await platformService.exportAudit({ reason: exportReason, search, action, resourceType, actor, from, until });
			const url = URL.createObjectURL(new Blob([result.csv], { type: 'text/csv;charset=utf-8' }));
			const link = document.createElement('a'); link.href = url; link.download = result.fileName; link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1000);
			exportReason = '';
			exportNotice = `${result.count} audit events exported and recorded.`;
		} catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to export audit evidence.'; }
		finally { exporting = false; }
	}
	onMount(load);
</script>

<svelte:head><title>Audit logs | WAS Platform</title></svelte:head>
<header class="mb-7">
	<p class="text-xs font-bold tracking-[0.2em] text-cyan-400">GOVERNANCE</p>
	<h1 class="mt-2 text-3xl font-bold">Platform audit logs</h1>
	<p class="mt-2 text-slate-400">Immutable operational evidence for sensitive platform actions.</p>
</header>
<form
	onsubmit={apply}
	class="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:grid-cols-3"
>
	<input
		class="field"
		aria-label="Search audit"
		placeholder="Actor, action, or resource"
		bind:value={search}
	/><input
		class="field"
		aria-label="Action filter"
		placeholder="Action, e.g. utility.status"
		bind:value={action}
	/><input
		class="field"
		aria-label="Resource filter"
		placeholder="Resource type"
		bind:value={resourceType}
	/><input class="field" aria-label="Actor filter" placeholder="Actor" bind:value={actor} />
	<label class="text-xs text-slate-400">From date<input class="field mt-1" type="date" bind:value={from} /></label>
	<label class="text-xs text-slate-400">Through date<input class="field mt-1" type="date" bind:value={until} /></label>
	<button class="rounded-xl border border-cyan-700 px-5 font-semibold text-cyan-300">Apply</button
	>
</form>
{#if page.data.platformSession?.role === 'finance-admin'}<p class="mb-4 text-sm text-amber-200">Finance access is limited to payment-related audit events. Sensitive details and IP addresses are omitted from finance exports.</p>{/if}
<div class="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
	<label class="min-w-64 flex-1 text-sm">Reason for evidence export<input class="field mt-2" bind:value={exportReason} maxlength="500" /></label>
	<button class="rounded-xl border border-cyan-700 px-4 py-3 text-sm font-semibold text-cyan-300 disabled:opacity-50" disabled={exporting || !exportReason.trim()} onclick={exportEvidence}>{exporting ? 'Preparing export…' : 'Export filtered CSV'}</button>
	<p class="w-full text-xs text-slate-400">Exports use the current filters and are limited to 5,000 events. Every export is audited.</p>
</div>
{#if exportNotice}<p role="status" class="mb-4 text-sm text-emerald-300">{exportNotice}</p>{/if}
{#if loading}<StatePanel
		variant="loading"
		title="Loading audit trail"
	/>{:else if errorMessage}<StatePanel
		variant="warning"
		title="Audit unavailable"
		message={errorMessage}
	/>{:else if !result?.items.length}<StatePanel
		title="No audit events found"
		message="Try broader filters."
	/>{:else if result}<div class="space-y-3">
		{#each result.items as entry}<article
				class="rounded-xl border border-slate-800 bg-slate-900 p-5"
			>
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 class="font-semibold">{entry.action}</h2>
						<p class="mt-1 text-sm text-slate-400">
							{entry.actor} · {entry.actorRole || entry.actorType}
						</p>
					</div>
					<time class="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time>
				</div>
				<dl class="mt-4 grid gap-3 text-xs sm:grid-cols-3">
					<div>
						<dt class="text-slate-500">Resource</dt>
						<dd class="mt-1">{entry.resourceType} {entry.resourceId}</dd>
					</div>
					<div>
						<dt class="text-slate-500">Request ID</dt>
						<dd class="mt-1 font-mono break-all">{entry.requestId || '—'}</dd>
					</div>
					<div>
						<dt class="text-slate-500">IP address</dt>
						<dd class="mt-1">{entry.ipAddress || '—'}</dd>
					</div>
				</dl>
				{#if entry.details}<details class="mt-4 text-xs">
						<summary class="cursor-pointer text-cyan-400">Recorded details</summary>
						<pre
							class="mt-2 overflow-auto rounded-lg bg-slate-950 p-3 text-slate-300">{entry.details}</pre>
					</details>{/if}
			</article>{/each}
	</div>
	<div class="mt-5 flex justify-between text-sm text-slate-400">
		<span>{result.total} events · Page {result.page} of {result.totalPages}</span>
		<div class="flex gap-2">
			<button
				class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40"
				disabled={pageNumber <= 1}
				onclick={() => {
					pageNumber--;
					load();
				}}>Previous</button
			><button
				class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40"
				disabled={pageNumber >= result.totalPages}
				onclick={() => {
					pageNumber++;
					load();
				}}>Next</button
			>
		</div>
	</div>{/if}

<style>
	.field {
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
