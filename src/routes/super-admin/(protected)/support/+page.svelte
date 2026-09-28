<script lang="ts">
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformSupportCase } from '$lib/platform/types';

	let cases = $state<PlatformSupportCase[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let filterTenant = $state('');
	let filterStatus = $state('');
	let filterSearch = $state('');
	let tenantId = $state('');
	let utilityTicketId = $state('');
	let subject = $state('');
	let category = $state('');
	let severity = $state<PlatformSupportCase['severity']>('Medium');
	let slaDueAt = $state('');

	async function load(event?: SubmitEvent) {
		event?.preventDefault();
		loading = true; errorMessage = '';
		try { cases = await platformService.supportCases({ tenantId: filterTenant.trim(), status: filterStatus, search: filterSearch.trim() }); }
		catch (error) { cases = []; errorMessage = error instanceof Error ? error.message : 'Unable to load support cases.'; }
		finally { loading = false; }
	}

	async function createCase(event: SubmitEvent) {
		event.preventDefault();
		const parsedTenant = Number(tenantId);
		const parsedTicket = utilityTicketId.trim() ? Number(utilityTicketId) : undefined;
		if (!Number.isSafeInteger(parsedTenant) || parsedTenant <= 0 || (parsedTicket !== undefined && (!Number.isSafeInteger(parsedTicket) || parsedTicket <= 0))) { errorMessage = 'Enter valid utility and ticket IDs.'; return; }
		if (!slaDueAt || Number.isNaN(new Date(slaDueAt).getTime())) { errorMessage = 'Enter an SLA due date and time.'; return; }
		saving = true; errorMessage = ''; successMessage = '';
		try {
			const record = await platformService.createSupportCase({ tenantId: parsedTenant, utilityTicketId: parsedTicket, subject, category, severity, slaDueAt: new Date(slaDueAt).toISOString() });
			tenantId = ''; utilityTicketId = ''; subject = ''; category = ''; slaDueAt = '';
			successMessage = `Case #${record.id} created and audited.`;
			await load();
		} catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to create support case.'; }
		finally { saving = false; }
	}

	onMount(() => { void load(); });
</script>

<svelte:head><title>Support and escalations | Water Assistant System</title></svelte:head>
<header class="mb-6"><p class="text-xs font-bold tracking-[.2em] text-cyan-400 uppercase">Support</p><h1 class="mt-2 text-3xl font-bold">Support and escalations</h1><p class="mt-2 text-sm text-slate-400">Platform-owned cases linked to a utility and optionally to its existing support ticket.</p></header>
<div class="mb-6 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-100">Internal notes and case changes are stored and audited. Subscriber Messenger updates, assignee alerts, and automated SLA notifications are not connected.</div>
{#if errorMessage}<p role="alert" class="mb-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">{errorMessage}</p>{/if}
{#if successMessage}<p role="status" class="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{successMessage}</p>{/if}
<div class="grid gap-6 xl:grid-cols-[1fr_340px]">
	<section class="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="text-lg font-bold">Cases</h2><form class="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]" onsubmit={load}><label class="text-sm">Search<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={filterSearch} maxlength="191" /></label><label class="text-sm">Utility ID<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="text" inputmode="numeric" bind:value={filterTenant} /></label><label class="text-sm">Status<select class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={filterStatus}><option value="">All</option><option>Open</option><option>Escalated</option><option>Resolved</option><option>Reopened</option></select></label><button class="self-end rounded-lg border border-cyan-700 px-4 py-2 text-cyan-300 disabled:opacity-50" disabled={loading}>Apply</button></form>
		{#if loading}<p role="status" class="mt-5 text-sm text-slate-400">Loading cases…</p>{:else if cases.length === 0}<p class="mt-5 text-sm text-slate-400">No cases match these filters.</p>{:else}<div class="mt-5 space-y-3">{#each cases as item (item.id)}<a class="block rounded-xl border border-slate-700 p-4 hover:border-cyan-700" href={`/super-admin/support/${item.id}`}><div class="flex justify-between gap-3"><strong>#{item.id} · {item.subject}</strong><span class="text-sm text-cyan-300">{item.status}</span></div><p class="mt-2 text-xs text-slate-400">Utility #{item.tenantId} · {item.category} · {item.severity} · Owner #{item.ownerPlatformUserId || 'Unassigned'}</p><p class="mt-1 text-xs text-slate-500">SLA due: {item.slaDueAt ? new Date(item.slaDueAt).toLocaleString() : 'Not set'}</p></a>{/each}</div><p class="mt-3 text-xs text-slate-500">Showing up to 100 most recently updated cases.</p>{/if}
	</section>
	<section class="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="text-lg font-bold">Create case</h2><form class="mt-4 space-y-4" onsubmit={createCase}><label class="block text-sm">Utility ID<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="text" inputmode="numeric" bind:value={tenantId} required /></label><label class="block text-sm">Existing utility ticket ID (optional)<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="text" inputmode="numeric" bind:value={utilityTicketId} /></label><label class="block text-sm">Subject<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={subject} maxlength="255" required /></label><label class="block text-sm">Category<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={category} maxlength="80" required /></label><label class="block text-sm">Severity<select class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={severity}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label class="block text-sm">SLA due<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="datetime-local" bind:value={slaDueAt} required /></label><button class="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={saving}>{saving ? 'Creating…' : 'Create case'}</button></form></section>
</div>
