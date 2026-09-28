<script lang="ts">
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformLedgerPayment, PlatformPage } from '$lib/platform/types';

	let result = $state<PlatformPage<PlatformLedgerPayment> | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');
	let tenantId = $state('');
	let status = $state('');
	let search = $state('');
	let currentPage = $state(1);

	async function load() {
		loading = true;
		errorMessage = '';
		try {
			result = await platformService.ledgerPayments({
				tenantId: tenantId.trim(), status: status.trim(), search: search.trim(), page: currentPage, pageSize: 20
			});
		} catch (error) {
			result = null;
			errorMessage = error instanceof Error ? error.message : 'Unable to load utility payment records.';
		} finally {
			loading = false;
		}
	}

	function applyFilters(event: SubmitEvent) {
		event.preventDefault();
		currentPage = 1;
		void load();
	}

	function movePage(page: number) {
		if (page < 1 || (result && page > result.totalPages)) return;
		currentPage = page;
		void load();
	}

	onMount(load);
</script>

<svelte:head><title>Utility payment records | Water Assistant System</title></svelte:head>

<header class="mb-6">
	<p class="text-xs font-bold tracking-[.2em] text-cyan-400 uppercase">Financial records</p>
	<h1 class="mt-2 text-3xl font-bold">Utility payment ledger</h1>
	<p class="mt-2 text-sm text-slate-400">Recorded utility payments across tenants. These entries are not proof of provider collection or settlement.</p>
</header>

<div class="mb-6 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-100">
	Provider transactions, service fees, callbacks, and settlements are not connected. The callback tests in Payment setup are simulations and do not appear as payments here.
</div>

<form onsubmit={applyFilters} class="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
	<label class="text-sm text-slate-300">Utility ID<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" type="text" inputmode="numeric" bind:value={tenantId} /></label>
	<label class="text-sm text-slate-300">Status<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" bind:value={status} maxlength="40" placeholder="e.g. posted" /></label>
	<label class="text-sm text-slate-300">Account or reference<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" bind:value={search} maxlength="191" /></label>
	<button class="self-end rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={loading}>Apply filters</button>
</form>

{#if loading}
	<p role="status" class="rounded-xl border border-slate-800 p-6 text-slate-300">Loading payment records…</p>
{:else if errorMessage}
	<div role="alert" class="rounded-xl border border-rose-800 bg-rose-950/30 p-6 text-rose-200">
		<p>{errorMessage}</p><button class="mt-3 rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white" onclick={load}>Try again</button>
	</div>
{:else if result}
	{#if result.items.length === 0}
		<p class="rounded-xl border border-slate-800 p-6 text-slate-400">No recorded utility payments match these filters.</p>
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
			<table class="w-full min-w-[760px] text-left text-sm">
				<thead class="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400"><tr><th class="p-4">Recorded</th><th class="p-4">Utility</th><th class="p-4">Account</th><th class="p-4">Reference</th><th class="p-4">Method</th><th class="p-4">Amount</th><th class="p-4">Ledger status</th></tr></thead>
				<tbody>{#each result.items as payment (payment.id)}<tr class="border-b border-slate-800/70 last:border-0"><td class="p-4">{new Date(payment.createdAt).toLocaleString()}</td><td class="p-4"><a class="text-cyan-300 underline" href={`/super-admin/utilities/${payment.tenantId}`}>#{payment.tenantId}</a></td><td class="p-4">{payment.accountMasked}</td><td class="p-4">{payment.referenceMasked}</td><td class="p-4">{payment.method || 'Unknown'}</td><td class="p-4">{payment.currency} {payment.amount}</td><td class="p-4">{payment.status}</td></tr>{/each}</tbody>
			</table>
		</div>
	{/if}
	<div class="mt-4 flex items-center justify-between text-sm text-slate-400">
		<span>{result.total} recorded item{result.total === 1 ? '' : 's'} · Page {result.page} of {Math.max(result.totalPages, 1)}</span>
		<div class="flex gap-2"><button class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40" disabled={loading || currentPage <= 1} onclick={() => movePage(currentPage - 1)}>Previous</button><button class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40" disabled={loading || currentPage >= result.totalPages} onclick={() => movePage(currentPage + 1)}>Next</button></div>
	</div>
{/if}
