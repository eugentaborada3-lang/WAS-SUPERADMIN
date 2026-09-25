<script lang="ts">
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformDashboard } from '$lib/platform/types';

	let dashboard = $state<PlatformDashboard | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');

	async function loadDashboard() {
		loading = true;
		errorMessage = '';
		try {
			dashboard = await platformService.dashboard();
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Unable to load the platform overview.';
		} finally {
			loading = false;
		}
	}
	onMount(loadDashboard);
	const cards = $derived(
		dashboard
			? [
					['Total utilities', dashboard.totalUtilities],
					['Active utilities', dashboard.activeUtilities],
					['Onboarding', dashboard.onboardingUtilities],
					['Suspended', dashboard.suspendedUtilities],
					['Platform users', dashboard.platformUsers]
				]
			: []
	);
</script>

<svelte:head><title>Platform overview | WAS</title></svelte:head>
<header class="mb-8">
	<p class="text-xs font-bold tracking-[0.2em] text-cyan-400">PLATFORM OVERVIEW</p>
	<h1 class="mt-2 text-3xl font-bold">Operational command center</h1>
	<p class="mt-2 text-slate-400">Live cross-utility status and recent administrative activity.</p>
</header>
{#if loading}<StatePanel
		variant="loading"
		title="Loading platform metrics"
		message="Reading current utility and access data."
	/>
{:else if errorMessage}<StatePanel
		variant="warning"
		title="Overview unavailable"
		message={errorMessage}
		actionLabel="Try again"
		actionHref="/super-admin/dashboard"
	/>
{:else if dashboard}
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
		{#each cards as card}<article class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
				<p class="text-sm text-slate-400">{card[0]}</p>
				<p class="mt-3 text-3xl font-black text-white">{card[1]}</p>
			</article>{/each}
	</div>
	<div class="mt-8 grid gap-6 xl:grid-cols-2">
		<section class="rounded-2xl border border-slate-800 bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-800 p-5">
				<h2 class="font-bold">Recently added utilities</h2>
				<a class="text-sm font-semibold text-cyan-400" href="/super-admin/utilities">View all</a>
			</div>
			{#if dashboard.recentUtilities.length}{#each dashboard.recentUtilities as utility}<a
						href={`/super-admin/utilities/${utility.id}`}
						class="flex items-center justify-between border-b border-slate-800/70 p-5 last:border-0 hover:bg-slate-800/50"
						><span
							><strong class="block">{utility.displayName}</strong><small class="text-slate-500"
								>{utility.slug}</small
							></span
						><span class="rounded-full bg-slate-800 px-3 py-1 text-xs">{utility.status}</span></a
					>{/each}{:else}<p class="p-6 text-sm text-slate-400">
					No utilities have been onboarded.
				</p>{/if}
		</section>
		<section class="rounded-2xl border border-slate-800 bg-slate-900">
			<div class="flex items-center justify-between border-b border-slate-800 p-5">
				<h2 class="font-bold">Recent platform activity</h2>
				<a class="text-sm font-semibold text-cyan-400" href="/super-admin/audit">Open audit</a>
			</div>
			{#if dashboard.recentAudit.length}{#each dashboard.recentAudit as entry}<div
						class="border-b border-slate-800/70 p-5 last:border-0"
					>
						<div class="flex justify-between gap-4">
							<strong class="text-sm">{entry.action}</strong><time class="text-xs text-slate-500"
								>{new Date(entry.createdAt).toLocaleString()}</time
							>
						</div>
						<p class="mt-1 text-xs text-slate-400">
							{entry.actor} · {entry.resourceType}
							{entry.resourceId}
						</p>
					</div>{/each}{:else}<p class="p-6 text-sm text-slate-400">
					No platform audit events yet.
				</p>{/if}
		</section>
	</div>
	{#if dashboard.deferredIntegrations.length}<aside
			class="mt-8 rounded-2xl border border-amber-900/70 bg-amber-950/20 p-5"
		>
			<h2 class="font-bold text-amber-200">Deferred integrations</h2>
			<p class="mt-2 text-sm text-amber-100/70">
				These require external credentials or provider decisions and are not simulated:
			</p>
			<ul class="mt-3 list-inside list-disc text-sm text-amber-100/70">
				{#each dashboard.deferredIntegrations as item}<li>{item}</li>{/each}
			</ul>
		</aside>{/if}
{/if}
