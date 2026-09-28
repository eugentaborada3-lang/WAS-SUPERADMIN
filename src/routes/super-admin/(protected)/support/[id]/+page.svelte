<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformSupportDetail } from '$lib/platform/types';

	const caseId = $derived(Number(page.params.id));
	let detail = $state<PlatformSupportDetail | null>(null);
	let loading = $state(true);
	let busy = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let ownerId = $state('');
	let note = $state('');
	let escalationSeverity = $state<'High' | 'Critical'>('High');
	let escalationReason = $state('');
	let resolutionSummary = $state('');
	let reopenReason = $state('');

	async function load() {
		loading = true; errorMessage = '';
		try { detail = await platformService.supportCase(caseId); }
		catch (error) { detail = null; errorMessage = error instanceof Error ? error.message : 'Unable to load case.'; }
		finally { loading = false; }
	}

	async function run(action: () => Promise<unknown>, message: string): Promise<boolean> {
		busy = true; errorMessage = ''; successMessage = '';
		try { await action(); detail = await platformService.supportCase(caseId); successMessage = message; return true; }
		catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to update case.'; return false; }
		finally { busy = false; }
	}

	function assign() {
		const parsed = Number(ownerId);
		if (!Number.isSafeInteger(parsed) || parsed <= 0) { errorMessage = 'Enter a valid active platform user ID.'; return; }
		void run(() => platformService.assignSupportCase(caseId, parsed), 'Case assignment saved and audited.');
	}

	function addNote() {
		if (!note.trim()) { errorMessage = 'Enter an internal note.'; return; }
		void run(() => platformService.addSupportNote(caseId, note), 'Internal note saved and audited.').then((saved) => { if (saved) note = ''; });
	}

	function escalate() {
		if (escalationReason.trim().length < 10) { errorMessage = 'Enter an escalation reason of at least 10 characters.'; return; }
		if (!confirm(`Escalate case #${caseId} to ${escalationSeverity}?`)) return;
		void run(() => platformService.escalateSupportCase(caseId, escalationSeverity, escalationReason), 'Case escalated and audited.');
	}

	function resolve() {
		if (resolutionSummary.trim().length < 10) { errorMessage = 'Enter a resolution summary of at least 10 characters.'; return; }
		if (!confirm(`Resolve case #${caseId}?`)) return;
		void run(() => platformService.resolveSupportCase(caseId, resolutionSummary), 'Case resolved and audited.');
	}

	function reopen() {
		if (reopenReason.trim().length < 10) { errorMessage = 'Enter a reopening reason of at least 10 characters.'; return; }
		if (!confirm(`Reopen case #${caseId}?`)) return;
		void run(() => platformService.reopenSupportCase(caseId, reopenReason), 'Case reopened and audited.');
	}

	onMount(() => { void load(); });
</script>

<svelte:head><title>Support case | Water Assistant System</title></svelte:head>
<a class="text-sm text-cyan-300" href="/super-admin/support">← All support cases</a>
{#if errorMessage}<p role="alert" class="mt-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">{errorMessage}</p>{/if}
{#if successMessage}<p role="status" class="mt-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{successMessage}</p>{/if}
{#if loading}<p role="status" class="mt-6 rounded-xl border border-slate-800 p-6">Loading case…</p>{:else if detail}
	<header class="my-6"><p class="text-xs font-bold tracking-[.2em] text-cyan-400 uppercase">Case #{detail.case.id}</p><h1 class="mt-2 text-3xl font-bold">{detail.case.subject}</h1><p class="mt-2 text-sm text-slate-400">{detail.case.category} · {detail.case.severity} · {detail.case.status}</p></header>
	<div class="mb-6 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-100">This platform case is internal. Notes and status changes are not sent to the utility or subscriber. Automated alerts and messaging are not connected.</div>
	<div class="grid gap-6 xl:grid-cols-[1fr_340px]">
		<div class="space-y-6">
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-bold">Case details</h2><dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt class="text-slate-400">Utility</dt><dd><a class="text-cyan-300 underline" href={`/super-admin/utilities/${detail.case.tenantId}`}>#{detail.case.tenantId}</a></dd></div><div><dt class="text-slate-400">Utility ticket</dt><dd>{detail.case.utilityTicketId || 'Not linked'}</dd></div><div><dt class="text-slate-400">Platform owner</dt><dd>{detail.case.ownerPlatformUserId || 'Unassigned'}</dd></div><div><dt class="text-slate-400">SLA due</dt><dd>{detail.case.slaDueAt ? new Date(detail.case.slaDueAt).toLocaleString() : 'Not set'}</dd></div><div><dt class="text-slate-400">Opened</dt><dd>{new Date(detail.case.createdAt).toLocaleString()}</dd></div><div><dt class="text-slate-400">Updated</dt><dd>{new Date(detail.case.updatedAt).toLocaleString()}</dd></div></dl>{#if detail.case.escalationReason}<p class="mt-4 text-sm">Escalation reason: {detail.case.escalationReason}</p>{/if}{#if detail.case.resolutionSummary}<p class="mt-4 text-sm">Resolution: {detail.case.resolutionSummary}</p>{/if}</section>
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-bold">Internal notes</h2>{#if detail.notes.length === 0}<p class="mt-3 text-sm text-slate-400">No internal notes yet.</p>{:else}<div class="mt-4 space-y-3">{#each detail.notes as item (item.id)}<article class="rounded-lg border border-slate-700 p-3"><p class="whitespace-pre-wrap text-sm">{item.body}</p><p class="mt-2 text-xs text-slate-500">Platform user #{item.authorPlatformUserId} · {new Date(item.createdAt).toLocaleString()}</p></article>{/each}</div>{/if}<label class="mt-5 block text-sm">Add internal note<textarea class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={note} maxlength="4000"></textarea></label><button class="mt-2 rounded-lg border border-cyan-700 px-4 py-2 text-cyan-300 disabled:opacity-50" disabled={busy || !note.trim()} onclick={addNote}>Save note</button></section>
		</div>
		<div class="space-y-6">
			<section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-bold">Assign owner</h2><label class="mt-3 block text-sm">Active platform user ID<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="text" inputmode="numeric" bind:value={ownerId} /></label><button class="mt-3 rounded-lg border border-cyan-700 px-4 py-2 text-cyan-300 disabled:opacity-50" disabled={busy} onclick={assign}>Assign</button></section>
			{#if detail.case.status !== 'Resolved'}<section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-bold">Escalate</h2><label class="mt-3 block text-sm">Severity<select class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={escalationSeverity}><option>High</option><option>Critical</option></select></label><label class="mt-3 block text-sm">Reason<textarea class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={escalationReason} maxlength="2000"></textarea></label><button class="mt-3 rounded-lg border border-amber-700 px-4 py-2 text-amber-300 disabled:opacity-50" disabled={busy} onclick={escalate}>Review escalation</button></section><section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-bold">Resolve</h2><label class="mt-3 block text-sm">Resolution summary<textarea class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={resolutionSummary} maxlength="2000"></textarea></label><button class="mt-3 rounded-lg border border-emerald-700 px-4 py-2 text-emerald-300 disabled:opacity-50" disabled={busy} onclick={resolve}>Review resolution</button></section>{:else}<section class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-bold">Reopen</h2><label class="mt-3 block text-sm">Reason<textarea class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={reopenReason} maxlength="2000"></textarea></label><button class="mt-3 rounded-lg border border-amber-700 px-4 py-2 text-amber-300 disabled:opacity-50" disabled={busy} onclick={reopen}>Review reopening</button></section>{/if}
		</div>
	</div>
{/if}
