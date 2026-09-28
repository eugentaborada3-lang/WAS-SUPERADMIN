<script lang="ts">
	import './page.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformDashboard } from '$lib/platform/types';

	let dashboard = $state<PlatformDashboard | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');
	const role = $derived(page.data.platformSession?.role);
	const roleLabel = $derived(role?.replaceAll('-', ' ') ?? 'platform user');

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
	const utilityCards = $derived(
		dashboard
			? [
					{ label: 'Total utilities', value: dashboard.totalUtilities, detail: 'All tenant records', href: '/super-admin/utilities' },
					{ label: 'Active utilities', value: dashboard.activeUtilities, detail: 'Operational tenants', href: '/super-admin/utilities' },
					{ label: 'Onboarding', value: dashboard.onboardingUtilities, detail: 'Onboarding or migration review', href: '/super-admin/utilities' },
					{ label: 'Suspended', value: dashboard.suspendedUtilities, detail: 'Suspended tenants', href: '/super-admin/utilities' }
				]
			: []
	);
	const operationsCards = $derived(
		dashboard
			? [
					{ label: 'Platform users', value: dashboard.platformUsers, detail: 'Platform-level accounts', href: '/super-admin/users', roles: ['super-admin', 'operations-admin'] },
					{ label: 'Utility users', value: dashboard.utilityUsers, detail: 'Accounts across utilities', href: '/super-admin/utility-users', roles: ['super-admin', 'operations-admin'] },
					{ label: 'Payment setups', value: dashboard.paymentSetups, detail: 'Configured records, not live status', href: '/super-admin/utilities', roles: ['super-admin', 'finance-admin'] },
					{ label: 'Open incidents', value: dashboard.openIncidents, detail: 'Unresolved technical incidents', href: '/super-admin/monitoring', roles: ['super-admin', 'operations-admin'] },
					{ label: 'Open support cases', value: dashboard.openSupportCases, detail: 'Unresolved escalations', href: '/super-admin/support', roles: ['super-admin', 'operations-admin', 'support-agent'] }
				].filter((card) => role && card.roles.includes(role))
			: []
	);
</script>

<svelte:head><title>Platform overview | WAS</title></svelte:head>
<header class="platform-hero mb-8">
	<div class="relative z-10">
		<p class="text-xs font-bold tracking-[0.2em] text-cyan-300">PLATFORM OVERVIEW</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Platform operations</h1>
		<p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Utility status, access records, incidents, and support activity from the shared platform database.</p>
		<p class="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize text-slate-300">{roleLabel}</p>
	</div>
	<a href="/super-admin/utilities" class="platform-hero-action relative z-10">Manage utilities <span aria-hidden="true">→</span></a>
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
	<section aria-labelledby="utility-metrics-heading">
		<div class="mb-4 flex items-end justify-between gap-3"><h2 id="utility-metrics-heading" class="text-xl font-semibold text-white">Utility network</h2><p class="text-xs text-slate-400">Current platform records</p></div>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each utilityCards as card}<a class="platform-metric" data-tone={card.label === 'Suspended' && card.value > 0 ? 'attention' : card.label === 'Active utilities' ? 'clear' : 'normal'} href={card.href}>
					<p class="text-sm font-medium text-slate-300">{card.label}</p>
					<p class="mt-5 text-4xl font-semibold tracking-tight text-white">{card.value.toLocaleString()}</p>
					<p class="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400"><span>{card.detail}</span><span aria-hidden="true">→</span></p>
				</a>{/each}
		</div>
	</section>
	<section class="mt-7" aria-labelledby="operations-metrics-heading">
		<div class="mb-4 flex items-end justify-between gap-3"><h2 id="operations-metrics-heading" class="text-xl font-semibold text-white">Platform operations</h2><p class="text-xs text-slate-400">Persisted operational records</p></div>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
			{#each operationsCards as card}<a class="platform-metric" data-tone={(card.label === 'Open incidents' || card.label === 'Open support cases') && card.value > 0 ? 'attention' : 'normal'} href={card.href}>
					<p class="text-sm font-medium text-slate-300">{card.label}</p>
					<p class="mt-5 text-4xl font-semibold tracking-tight text-white">{card.value.toLocaleString()}</p>
					<p class="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400"><span>{card.detail}</span><span aria-hidden="true">→</span></p>
				</a>{/each}
		</div>
	</section>
	<div class="mt-7 grid gap-5 xl:grid-cols-2">
		<section class="platform-panel">
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
		{#if page.data.platformSession?.role !== 'support-agent'}<section class="platform-panel">
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
		</section>{/if}
	</div>
	{#if dashboard.deferredIntegrations.length}<aside
			class="mt-7 rounded-2xl border border-amber-900/70 bg-amber-950/20 p-5"
		>
			<h2 class="font-bold text-amber-200">Unavailable integrations</h2>
			<p class="mt-2 text-sm text-amber-100/70">
				These require external credentials or provider decisions and are not simulated:
			</p>
			<ul class="mt-3 list-inside list-disc text-sm text-amber-100/70">
				{#each dashboard.deferredIntegrations as item}<li>{item}</li>{/each}
			</ul>
		</aside>{/if}
{/if}
