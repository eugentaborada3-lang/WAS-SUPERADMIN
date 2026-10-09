<script lang="ts">
	import './page.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { AnalyticsMetric, PlatformDashboard, PlatformUtility } from '$lib/platform/types';

	let dashboard = $state<PlatformDashboard | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');
	let utilities = $state<PlatformUtility[]>([]);
	let from = $state(page.url.searchParams.get('from') ?? '');
	let until = $state(page.url.searchParams.get('until') ?? '');
	let tenantId = $state(page.url.searchParams.get('tenantId') ?? '');
	let region = $state(page.url.searchParams.get('region') ?? '');
	let status = $state(page.url.searchParams.get('status') ?? '');
	const role = $derived(page.data.platformSession?.role);
	const roleLabel = $derived(role?.replaceAll('-', ' ') ?? 'platform user');
	const analytics = $derived(dashboard?.analytics ?? null);
	const paymentTrend = $derived(analytics?.trends.payments ?? []);
	const paymentTrendMaximum = $derived(Math.max(1, ...paymentTrend.map((point) => Number(point.value))));

	function formatAnalyticsMetric(metric: AnalyticsMetric) {
		if (!metric.available || metric.value === undefined) return 'Not available yet';
		const value = Number(metric.value);
		if (metric.unit === 'PHP') return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
		if (metric.unit === 'percent') return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
		return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
	}

	async function loadDashboard() {
		loading = true;
		errorMessage = '';
		try {
			dashboard = await platformService.dashboard({ from, until, tenantId, region, status });
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'Unable to load the platform overview.';
		} finally {
			loading = false;
		}
	}
	async function applyFilters() {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries({ from, until, tenantId, region, status }))
			if (value) params.set(key, value);
		await goto(`/super-admin/dashboard${params.size ? `?${params}` : ''}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
		await loadDashboard();
	}
	onMount(async () => {
		try {
			utilities = (await platformService.utilities({ pageSize: 100 })).items;
		} catch {
			utilities = [];
		}
		await loadDashboard();
	});
	const utilityCards = $derived(
		dashboard
			? [
					{
						label: 'Total utilities',
						value: dashboard.totalUtilities,
						detail: 'All tenant records',
						href: '/super-admin/utilities'
					},
					{
						label: 'Active utilities',
						value: dashboard.activeUtilities,
						detail: 'Operational tenants',
						href: '/super-admin/utilities'
					},
					{
						label: 'Onboarding',
						value: dashboard.onboardingUtilities,
						detail: 'Onboarding or migration review',
						href: '/super-admin/utilities'
					},
					{
						label: 'Suspended',
						value: dashboard.suspendedUtilities,
						detail: 'Suspended tenants',
						href: '/super-admin/utilities'
					}
				]
			: []
	);
	const operationsCards = $derived(
		dashboard
			? [
					{
						label: 'Platform users',
						value: dashboard.platformUsers,
						detail: 'Platform-level accounts',
						href: '/super-admin/users',
						roles: ['super-admin', 'operations-admin']
					},
					{
						label: 'Utility users',
						value: dashboard.utilityUsers,
						detail: 'Accounts across utilities',
						href: '/super-admin/utility-users',
						roles: ['super-admin', 'operations-admin']
					},
					{
						label: 'Payment setups',
						value: dashboard.paymentSetups,
						detail: 'Configured records, not live status',
						href: '/super-admin/utilities',
						roles: ['super-admin', 'finance-admin']
					},
					{
						label: 'Open incidents',
						value: dashboard.openIncidents,
						detail: 'Unresolved technical incidents',
						href: '/super-admin/monitoring',
						roles: ['super-admin', 'operations-admin']
					},
					{
						label: 'Open support cases',
						value: dashboard.openSupportCases,
						detail: 'Unresolved escalations',
						href: '/super-admin/support',
						roles: ['super-admin', 'operations-admin', 'support-agent']
					}
				].filter((card) => role && card.roles.includes(role))
			: []
	);
	const billingCards = $derived(
		dashboard
			? [
					{
						label: 'Bills generated',
						value: dashboard.billsGenerated.toLocaleString(),
						detail: 'Persisted billing records',
						href: '/super-admin/reports'
					},
					{
						label: 'Recorded payments',
						value: dashboard.recordedPayments.toLocaleString(),
						detail: 'Ledger entries, not provider proof',
						href: '/super-admin/transactions'
					}
				]
			: []
	);
	const tenantDataCards = $derived(
		dashboard
			? [
					{ label: 'Customers', value: dashboard.customers, href: '/super-admin/reports' },
					{ label: 'Meters', value: dashboard.meters, href: '/super-admin/reports' },
					{ label: 'Routes', value: dashboard.routes, href: '/super-admin/reports' },
					{ label: 'Readings', value: dashboard.readings, href: '/super-admin/reports' },
					{ label: 'Billing cycles', value: dashboard.billingCycles, href: '/super-admin/reports' },
					{
						label: 'Open exceptions',
						value: dashboard.openExceptions,
						href: '/super-admin/monitoring'
					},
					{
						label: 'Support tickets',
						value: dashboard.supportTickets,
						href: '/super-admin/support'
					}
				]
			: []
	);
	const financeCards = $derived(
		dashboard?.financialDataVisible
			? [
					{
						label: 'Recorded payment volume',
						value: `PHP ${dashboard.totalPaymentVolume}`,
						detail: 'Not verified settlement'
					},
					{
						label: 'Recorded service fees',
						value: `PHP ${dashboard.recordedServiceFees}`,
						detail: 'Persisted fees only'
					}
				]
			: []
	);
</script>

<svelte:head><title>Platform overview | WAS</title></svelte:head>
<div class="platform-dashboard-page">
<header class="platform-hero mb-8">
	<div class="relative z-10">
		<p class="text-xs font-bold tracking-[0.2em] text-cyan-300">PLATFORM OVERVIEW</p>
		<h1 class="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
			Platform operations
		</h1>
		<p class="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
			Utility status, access records, incidents, and support activity from the shared platform
			database.
		</p>
		<p
			class="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 capitalize"
		>
			{roleLabel}
		</p>
	</div>
	<a href="/super-admin/utilities" class="platform-hero-action relative z-10"
		>Manage utilities <span aria-hidden="true">→</span></a
	>
</header>
<form
	class="platform-filterbar mb-7 grid gap-3 p-4 md:grid-cols-6"
	onsubmit={(event) => {
		event.preventDefault();
		applyFilters();
	}}
>
	<label class="text-xs text-slate-300"
		>From<input
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
			type="date"
			bind:value={from}
		/></label
	>
	<label class="text-xs text-slate-300"
		>Until (exclusive)<input
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
			type="date"
			bind:value={until}
		/></label
	>
	<label class="text-xs text-slate-300"
		>Utility<select
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
			bind:value={tenantId}
			><option value="">All utilities</option>{#each utilities as item}<option
					value={String(item.id)}>{item.displayName}</option
				>{/each}</select
		></label
	>
	<label class="text-xs text-slate-300"
		>Region<input
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
			bind:value={region}
			placeholder="All regions"
		/></label
	>
	<label class="text-xs text-slate-300"
		>Status<select
			class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
			bind:value={status}
			><option value="">All statuses</option><option>Active</option><option>Onboarding</option
			><option>Migration Review</option><option>Suspended</option></select
		></label
	>
	<button
		class="self-end rounded-lg bg-cyan-600 px-4 py-2 font-semibold"
		type="submit"
		disabled={loading}>Apply filters</button
	>
</form>
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
		<div class="mb-4 flex items-end justify-between gap-3">
			<h2 id="utility-metrics-heading" class="text-xl font-semibold text-white">Utility network</h2>
			<p class="text-xs text-slate-400">Current platform records</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each utilityCards as card}<a
					class="platform-metric"
					data-tone={card.label === 'Suspended' && card.value > 0
						? 'attention'
						: card.label === 'Active utilities'
							? 'clear'
							: 'normal'}
					href={card.href}
				>
					<p class="text-sm font-medium text-slate-300">{card.label}</p>
					<p class="mt-5 text-4xl font-semibold tracking-tight text-white">
						{card.value.toLocaleString()}
					</p>
					<p class="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
						<span>{card.detail}</span><span aria-hidden="true">→</span>
					</p>
				</a>{/each}
		</div>
	</section>
	<section class="mt-7" aria-labelledby="operations-metrics-heading">
		<div class="mb-4 flex items-end justify-between gap-3">
			<h2 id="operations-metrics-heading" class="text-xl font-semibold text-white">
				Platform operations
			</h2>
			<p class="text-xs text-slate-400">Persisted operational records</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
			{#each operationsCards as card}<a
					class="platform-metric"
					data-tone={(card.label === 'Open incidents' || card.label === 'Open support cases') &&
					card.value > 0
						? 'attention'
						: 'normal'}
					href={card.href}
				>
					<p class="text-sm font-medium text-slate-300">{card.label}</p>
					<p class="mt-5 text-4xl font-semibold tracking-tight text-white">
						{card.value.toLocaleString()}
					</p>
					<p class="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
						<span>{card.detail}</span><span aria-hidden="true">→</span>
					</p>
				</a>{/each}
		</div>
	</section>
	<section class="mt-7" aria-labelledby="billing-metrics-heading">
		<div class="mb-4 flex items-end justify-between gap-3">
			<h2 id="billing-metrics-heading" class="text-xl font-semibold text-white">Billing records</h2>
			<p class="text-xs text-slate-400">Persisted platform totals</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each billingCards as card}<a class="platform-metric" href={card.href}>
					<p class="text-sm font-medium text-slate-300">{card.label}</p>
					<p class="mt-5 text-3xl font-semibold tracking-tight text-white">{card.value}</p>
					<p class="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
						<span>{card.detail}</span><span aria-hidden="true">→</span>
					</p>
				</a>{/each}
			{#each financeCards as card}<div class="platform-metric">
					<p class="text-sm font-medium text-slate-300">{card.label}</p>
					<p class="mt-5 text-3xl font-semibold tracking-tight text-white">{card.value}</p>
					<p class="mt-4 text-xs text-amber-200">{card.detail}</p>
				</div>{/each}
		</div>
		{#if !dashboard.financialDataVisible}<p class="mt-3 text-xs text-slate-500">
				Financial amounts are restricted to Super Admin and Finance Admin roles.
			</p>{/if}
	</section>
	<section class="mt-7" aria-labelledby="tenant-data-heading">
		<div class="mb-4 flex items-end justify-between gap-3">
			<h2 id="tenant-data-heading" class="text-xl font-semibold text-white">Tenant operations</h2>
			<p class="text-xs text-slate-400">
				Generated {new Date(dashboard.generatedAt).toLocaleString()}
			</p>
		</div>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each tenantDataCards as card}<a class="platform-metric" href={card.href}
					><p class="text-sm font-medium text-slate-300">{card.label}</p>
					<p class="mt-5 text-3xl font-semibold text-white">{card.value.toLocaleString()}</p>
					<p class="mt-4 text-xs text-slate-400">
						Persisted records <span aria-hidden="true">→</span>
					</p></a
				>{/each}
			{#if dashboard.financialDataVisible}<div class="platform-metric">
					<p class="text-sm font-medium text-slate-300">Collection rate</p>
					<p class="mt-5 text-3xl font-semibold text-white">
						{dashboard.collectionRate ? `${dashboard.collectionRate}%` : 'Not available yet'}
					</p>
					<p class="mt-4 text-xs text-slate-400">Recorded payments ÷ generated bill amount</p>
				</div>{/if}
		</div>
	</section>
	{#if analytics}
		<section class="platform-analytics mt-7" aria-labelledby="platform-analytics-heading">
			<div class="platform-analytics-heading">
				<div><p>PLATFORM ANALYTICS</p><h2 id="platform-analytics-heading">Measured performance</h2></div>
				<small>Data through {new Date(analytics.dataThrough).toLocaleString()}</small>
			</div>
			<div class="platform-analytics-metrics">
				{#each analytics.metrics as metric}
					<a class="platform-analytics-metric" href={metric.drilldown} title={metric.basis}>
						<span data-kind={metric.classification}>{metric.classification}</span>
						<strong>{formatAnalyticsMetric(metric)}</strong>
						<b>{metric.label}</b>
						{#if metric.comparisonPercent !== undefined}<em class="platform-comparison" data-direction={Number(metric.comparisonPercent) >= 0 ? 'up' : 'down'}>{Number(metric.comparisonPercent) >= 0 ? '+' : ''}{metric.comparisonPercent}% vs previous period</em>{/if}
						<small>{metric.basis}</small>
					</a>
				{/each}
			</div>
			<div class="platform-analytics-grid">
				<div class="platform-trend">
					<h3>Recorded payment volume</h3>
					{#if paymentTrend.length}
						<div class="platform-trend-bars" role="img" aria-label="Daily recorded payment volume">
							{#each paymentTrend as point}<div title={`${point.period}: PHP ${Number(point.value).toLocaleString()}`}><span style={`height: ${Math.max(4, (Number(point.value) / paymentTrendMaximum) * 100)}%`}></span><small>{point.period.slice(5)}</small></div>{/each}
						</div>
					{:else}<p>No recorded payment data is available for this period or role.</p>{/if}
				</div>
				<div class="platform-integration-status">
					<h3>Integration observations</h3>
					<ul>{#each analytics.integrations as integration}<li><span><strong>{integration.key.replaceAll('-', ' ')}</strong><small>{integration.classification}{integration.observedAt ? ` · ${new Date(integration.observedAt).toLocaleString()}` : ''}</small></span><b data-state={integration.classification}>{integration.status}</b></li>{/each}</ul>
				</div>
			</div>
		</section>
	{/if}
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
</div>
