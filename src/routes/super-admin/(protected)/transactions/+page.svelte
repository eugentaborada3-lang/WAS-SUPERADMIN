<script lang="ts">
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformLedgerPayment, PlatformLedgerPaymentDetail, PlatformPage } from '$lib/platform/types';

	let result = $state<PlatformPage<PlatformLedgerPayment> | null>(null);
	let loading = $state(true);
	let errorMessage = $state('');
	let tenantId = $state('');
	let status = $state('');
	let search = $state('');
	let currentPage = $state(1);
	let selected = $state<PlatformLedgerPaymentDetail | null>(null);
	let detailLoading = $state(false);
	let exportReason = $state('');
	let exporting = $state(false);
	let successMessage = $state('');

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

	async function viewPayment(id: number) {
		detailLoading = true;
		errorMessage = '';
		try {
			selected = await platformService.ledgerPayment(id);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to load payment evidence.';
		} finally {
			detailLoading = false;
		}
	}

	async function exportPayments() {
		if (exportReason.trim().length < 5) {
			errorMessage = 'Enter an export reason of at least 5 characters.';
			return;
		}
		exporting = true;
		errorMessage = '';
		successMessage = '';
		try {
			const exported = await platformService.exportLedgerPayments({
				tenantId: tenantId.trim() ? Number(tenantId) : undefined,
				status: status.trim(),
				search: search.trim(),
				reason: exportReason.trim()
			});
			const blob = new Blob([exported.csv], { type: 'text/csv;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = exported.fileName;
			anchor.click();
			URL.revokeObjectURL(url);
			exportReason = '';
			successMessage = `Exported ${exported.count} masked payment record${exported.count === 1 ? '' : 's'}.`;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unable to export payment records.';
		} finally {
			exporting = false;
		}
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
	This ledger shows stored payment, fee, callback, and posting fields when they exist. Provider collection and settlement remain unverified unless real provider evidence is connected. Payment-setup callback tests are simulations and never appear as payments here.
</div>

<form onsubmit={applyFilters} class="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
	<label class="text-sm text-slate-300">Utility ID<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" type="text" inputmode="numeric" bind:value={tenantId} /></label>
	<label class="text-sm text-slate-300">Status<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" bind:value={status} maxlength="40" placeholder="e.g. posted" /></label>
	<label class="text-sm text-slate-300">Account or reference<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" bind:value={search} maxlength="191" /></label>
	<button class="self-end rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={loading}>Apply filters</button>
</form>

<section class="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5" aria-labelledby="export-heading">
	<h2 id="export-heading" class="font-semibold">Export masked evidence</h2>
	<p class="mt-1 text-xs text-slate-400">The CSV uses the active filters and contains masked account and reference values. The reason is recorded in the immutable audit trail.</p>
	<div class="mt-3 flex flex-col gap-3 sm:flex-row"><label class="grow text-sm text-slate-300">Export reason<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2" bind:value={exportReason} minlength="5" maxlength="500" /></label><button class="self-end rounded-lg border border-cyan-700 px-4 py-2 font-semibold text-cyan-200 disabled:opacity-50" onclick={exportPayments} disabled={exporting || exportReason.trim().length < 5}>{exporting ? 'Exporting…' : 'Export CSV'}</button></div>
</section>

{#if successMessage}<p role="status" class="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{successMessage}</p>{/if}

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
				<thead class="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400"><tr><th class="p-4">Recorded</th><th class="p-4">Utility</th><th class="p-4">Account</th><th class="p-4">Reference</th><th class="p-4">Method</th><th class="p-4">Amount</th><th class="p-4">Ledger status</th><th class="p-4">Evidence</th></tr></thead>
				<tbody>{#each result.items as payment (payment.id)}<tr class="border-b border-slate-800/70 last:border-0"><td class="p-4">{new Date(payment.createdAt).toLocaleString()}</td><td class="p-4"><a class="text-cyan-300 underline" href={`/super-admin/utilities/${payment.tenantId}`}>#{payment.tenantId}</a></td><td class="p-4">{payment.accountMasked}</td><td class="p-4">{payment.referenceMasked}</td><td class="p-4">{payment.method || 'Unknown'}</td><td class="p-4">{payment.currency} {payment.amount}</td><td class="p-4">{payment.status}</td><td class="p-4"><button class="rounded-lg border border-slate-700 px-3 py-1.5 text-cyan-300 disabled:opacity-50" onclick={() => viewPayment(payment.id)} disabled={detailLoading}>View</button></td></tr>{/each}</tbody>
			</table>
		</div>
	{/if}
	<div class="mt-4 flex items-center justify-between text-sm text-slate-400">
		<span>{result.total} recorded item{result.total === 1 ? '' : 's'} · Page {result.page} of {Math.max(result.totalPages, 1)}</span>
		<div class="flex gap-2"><button class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40" disabled={loading || currentPage <= 1} onclick={() => movePage(currentPage - 1)}>Previous</button><button class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40" disabled={loading || currentPage >= result.totalPages} onclick={() => movePage(currentPage + 1)}>Next</button></div>
	</div>
{/if}

{#if selected}<div class="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" role="presentation" onclick={(event) => { if (event.currentTarget === event.target) selected = null; }}>
	<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6" role="dialog" aria-modal="true" aria-labelledby="payment-detail-title">
		<div class="flex items-start justify-between gap-4"><div><p class="text-xs font-bold uppercase tracking-[.18em] text-cyan-400">Masked ledger evidence</p><h2 id="payment-detail-title" class="mt-2 text-xl font-bold">Payment #{selected.id}</h2></div><button class="rounded-lg border border-slate-700 px-3 py-2" onclick={() => selected = null} aria-label="Close payment detail">Close</button></div>
		<div class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
			<p><span class="block text-slate-500">Utility</span>#{selected.tenantId}</p><p><span class="block text-slate-500">Recorded</span>{new Date(selected.createdAt).toLocaleString()}</p>
			<p><span class="block text-slate-500">Account</span>{selected.accountMasked}</p><p><span class="block text-slate-500">Reference</span>{selected.referenceMasked}</p>
			<p><span class="block text-slate-500">Provider reference</span>{selected.providerTransactionMasked}</p><p><span class="block text-slate-500">Bill</span>{selected.billId ? `#${selected.billId}` : 'Not linked'}</p>
			<p><span class="block text-slate-500">Amount</span>{selected.currency} {selected.amount}</p><p><span class="block text-slate-500">Recorded fee</span>{selected.currency} {selected.fee}</p>
			<p><span class="block text-slate-500">Callback state</span>{selected.callbackStatus || 'Not available'}</p><p><span class="block text-slate-500">Posting state</span>{selected.postingStatus || 'Not available'}</p>
			<p><span class="block text-slate-500">Settlement batch</span>{selected.settlementBatch || 'Not available'}</p><p><span class="block text-slate-500">Method</span>{selected.method || 'Unknown'}</p>
		</div>
		<div class="mt-5 rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-100"><strong>Provider verified: No · Settlement verified: No</strong><p class="mt-1">{selected.evidenceState}</p></div>
	</div>
</div>{/if}
