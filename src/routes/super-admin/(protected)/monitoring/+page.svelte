<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { platformService } from '$lib/platform/service';
	import type { PlatformHealthSnapshot, PlatformIncident } from '$lib/platform/types';

	let health = $state<PlatformHealthSnapshot | null>(null);
	let incidents = $state<PlatformIncident[]>([]);
	let loading = $state(true);
	let busy = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let serviceName = $state('');
	let summary = $state('');
	let severity = $state<PlatformIncident['severity']>('Medium');
	let affectedTenant = $state('');
	let resolutionNotes = $state<Record<number, string>>({});
	const canManage = $derived(page.data.platformSession?.role === 'super-admin');

	async function load() {
		loading = true;
		errorMessage = '';
		health = null;
		try {
			health = await platformService.healthSnapshot();
			incidents = await platformService.incidents();
		} catch (error) {
			incidents = [];
			errorMessage = error instanceof Error ? error.message : 'Monitoring data is unavailable.';
		} finally { loading = false; }
	}

	async function createIncident(event: SubmitEvent) {
		event.preventDefault();
		busy = true; errorMessage = ''; successMessage = '';
		try {
			const affectedTenantId = affectedTenant.trim() ? Number(affectedTenant) : undefined;
			if (affectedTenantId !== undefined && (!Number.isSafeInteger(affectedTenantId) || affectedTenantId <= 0)) throw new Error('Enter a valid utility ID.');
			await platformService.createIncident({ serviceName, summary, severity, affectedTenantId });
			serviceName = ''; summary = ''; affectedTenant = '';
			incidents = await platformService.incidents();
			successMessage = 'Incident created and audited.';
		} catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to create incident.'; }
		finally { busy = false; }
	}

	async function resolveIncident(incident: PlatformIncident) {
		const note = resolutionNotes[incident.id]?.trim() || '';
		if (note.length < 10) { errorMessage = 'Enter a resolution note of at least 10 characters.'; return; }
		if (!confirm(`Resolve incident #${incident.id}? This action is audited.`)) return;
		busy = true; errorMessage = ''; successMessage = '';
		try {
			await platformService.resolveIncident(incident.id, note);
			incidents = await platformService.incidents();
			resolutionNotes[incident.id] = '';
			successMessage = `Incident #${incident.id} resolved and audited.`;
		} catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to resolve incident.'; }
		finally { busy = false; }
	}

	onMount(() => { void load(); });
</script>

<svelte:head><title>System monitoring | Water Assistant System</title></svelte:head>
<header class="mb-6 flex flex-wrap items-end justify-between gap-3">
	<div><p class="text-xs font-bold tracking-[.2em] text-cyan-400 uppercase">Operations</p><h1 class="mt-2 text-3xl font-bold">System health and incidents</h1><p class="mt-2 text-sm text-slate-400">Observed signals only. Unconnected integrations are not considered healthy.</p></div>
	<button class="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-300 disabled:opacity-50" disabled={loading} onclick={load}>Refresh</button>
</header>

{#if errorMessage}<p role="alert" class="mb-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">{errorMessage}</p>{/if}
{#if successMessage}<p role="status" class="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{successMessage}</p>{/if}
{#if loading}<p role="status" class="rounded-xl border border-slate-800 p-6">Loading observed health…</p>{:else if health}
	<p class="mb-4 text-xs text-slate-500">Sampled {new Date(health.observedAt).toLocaleString()}. This is not an uptime or SLA measurement.</p>
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each health.services as service (service.name)}<article class="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="font-semibold">{service.name}</h2><p class={`mt-3 text-lg font-bold ${service.status === 'Healthy' ? 'text-emerald-300' : service.status === 'Critical' ? 'text-rose-300' : 'text-amber-200'}`}>{service.status}</p><p class="mt-2 text-xs text-slate-400">{service.detail}</p>{#if service.latencyMs !== undefined}<p class="mt-2 text-xs text-slate-500">Probe latency: {service.latencyMs} ms</p>{/if}</article>{/each}
	</div>
{/if}

<div class="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">
	<section class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
		<h2 class="text-lg font-bold">Incidents</h2>
		<p class="mt-1 text-xs text-slate-400">The latest 100 persisted incidents. Provider alerts are not connected.</p>
		{#if incidents.length === 0}<p class="mt-5 text-sm text-slate-400">No incidents have been recorded. This does not prove that all services are healthy.</p>{:else}<div class="mt-5 space-y-4">{#each incidents as incident (incident.id)}<article class="rounded-xl border border-slate-700 p-4"><div class="flex flex-wrap justify-between gap-3"><div><h3 class="font-semibold">#{incident.id} · {incident.summary}</h3><p class="mt-1 text-xs text-slate-400">{incident.serviceName} · {incident.severity} · Owner #{incident.ownerUserId}{incident.affectedTenantId ? ` · Utility #${incident.affectedTenantId}` : ''}</p></div><span class="text-sm" class:text-amber-300={incident.status === 'Open'} class:text-emerald-300={incident.status === 'Resolved'}>{incident.status}</span></div><p class="mt-2 text-xs text-slate-500">Opened {new Date(incident.createdAt).toLocaleString()}</p>{#if incident.resolutionNote}<p class="mt-3 text-sm text-slate-300">Resolution: {incident.resolutionNote}</p>{/if}{#if canManage && incident.status === 'Open'}<label class="mt-4 block text-sm">Resolution note<textarea class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" maxlength="2000" bind:value={resolutionNotes[incident.id]}></textarea></label><button class="mt-2 rounded-lg border border-emerald-700 px-3 py-2 text-sm text-emerald-300 disabled:opacity-50" disabled={busy} onclick={() => resolveIncident(incident)}>Review and resolve</button>{/if}</article>{/each}</div>{/if}
	</section>
	{#if canManage}<section class="h-fit rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 class="text-lg font-bold">Record incident</h2><form class="mt-4 space-y-4" onsubmit={createIncident}><label class="block text-sm">Service name<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={serviceName} maxlength="80" required /></label><label class="block text-sm">Summary<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={summary} maxlength="255" required /></label><label class="block text-sm">Severity<select class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={severity}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label class="block text-sm">Affected utility ID (optional)<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="text" inputmode="numeric" bind:value={affectedTenant} /></label><button class="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy}>Create incident</button></form></section>{/if}
</div>
