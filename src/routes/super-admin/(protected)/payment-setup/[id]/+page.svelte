<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import './page.css';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PaymentCallbackTest, PaymentFeeQuote, PaymentSetupConfig, PaymentSetupInput, PaymentSetupNotice, PaymentSetupState, PlatformUtility } from '$lib/platform/types';
	const utilityId = $derived(Number(page.params.id));
	let utilities = $state<PlatformUtility[]>([]);
	let paymentState = $state<PaymentSetupState | null>(null);
	let logs = $state<PaymentCallbackTest[]>([]);
	let notices = $state<PaymentSetupNotice[]>([]);
	let loading = $state(true);
	let busy = $state(false);
	let error = $state('');
	let success = $state('');
	let amount = $state('100.00');
	let forceFailure = $state(false);
	let quote = $state<PaymentFeeQuote | null>(null);
	let testKey = $state('');
	let form = $state<PaymentSetupInput>({merchantId:'',checkoutUrl:'https://checkout.example.invalid/webpay',callbackUrl:'https://api.example.invalid/api/payments/gcash/callback',credentialRef:'local-sim://gcash',feeModel:'fixed',transactionFee:'0',convenienceFee:'0',vatEnabled:false,feePayer:'subscriber',settlementDestination:'',settlementCycle:'daily',reason:''});
	const selectedUtility = $derived(utilities.find((utility) => utility.id === utilityId));
	function fill(config: PaymentSetupConfig) {form = {merchantId:config.merchantId,checkoutUrl:config.checkoutUrl,callbackUrl:config.callbackUrl,credentialRef:config.credentialRef,feeModel:config.feeModel,transactionFee:config.transactionFee,convenienceFee:config.convenienceFee,vatEnabled:config.vatEnabled,feePayer:config.feePayer,settlementDestination:config.settlementDestination,settlementCycle:config.settlementCycle,reason:''};}
	async function load() {
		loading = true; error = '';
		try {
			const [utilityPage, loadedState, callbackLogs, paymentNotices] = await Promise.all([platformService.utilities({pageSize:100}),platformService.paymentSetup(utilityId),platformService.paymentTestLogs(utilityId),platformService.paymentNotices(utilityId)]);
			utilities = utilityPage.items; paymentState = loadedState; logs = callbackLogs; notices = paymentNotices;
			if (loadedState.config) fill(loadedState.config);
		} catch (e) {error = e instanceof Error ? e.message : 'Unable to load payment setup.';}
		finally {loading = false;}
	}
	async function save() {
		busy = true; error = ''; success = '';
		try {const config = await platformService.savePaymentSetup(utilityId,form); if (paymentState) paymentState.config = config; form.reason = ''; quote = null; success = 'Configuration saved for testing. It is not production-active.'; await load();}
		catch (e) {error = e instanceof Error ? e.message : 'Unable to save setup.';}
		finally {busy = false;}
	}
	async function simulateFee() {
		busy = true; error = '';
		try {quote = await platformService.paymentQuote(utilityId,amount);}
		catch (e) {error = e instanceof Error ? e.message : 'Unable to calculate fee.';}
		finally {busy = false;}
	}
	async function runTest() {
		busy = true; error = ''; success = '';
		if (!testKey) testKey = crypto.randomUUID();
		try {const result = await platformService.paymentTest(utilityId,amount,forceFailure,testKey); success = result.status === 'Passed' ? 'Simulated callback passed. Production activation is still blocked.' : 'Simulated callback failed; a failure notice was created.'; testKey = ''; await load();}
		catch (e) {error = e instanceof Error ? e.message : 'Unable to run callback test. Retry uses the same idempotency key.';}
		finally {busy = false;}
	}
	async function disable() {
		if (!form.reason.trim()) {error = 'Enter a reason before disabling payment setup.'; return;}
		if (!confirm('Disable this utility payment setup? New payment links must remain blocked.')) return;
		busy = true; error = ''; success = '';
		try {await platformService.disablePaymentSetup(utilityId,form.reason); success = 'Payment setup disabled and audited.'; await load();}
		catch (e) {error = e instanceof Error ? e.message : 'Unable to disable setup.';}
		finally {busy = false;}
	}
	onMount(load);
</script>
<svelte:head><title>GCash setup | WAS Platform</title></svelte:head>
<div class="platform-payment-setup-detail-page">
<header class="mb-7"><a class="text-sm text-cyan-300" href="/super-admin/payment-setup">← Payment setup</a><p class="mt-4 text-xs font-bold tracking-[0.2em] text-cyan-400">SA-06 · SIMULATOR</p><h1 class="mt-2 text-3xl font-bold">GCash channel and fees</h1><p class="mt-2 text-sm text-amber-200">Configuration and callbacks here are simulated. No money moves, no bill is posted, and production activation is unavailable.</p></header>
{#if loading}<StatePanel variant="loading" title="Loading payment configuration" />
{:else if !paymentState}<StatePanel variant="warning" title="Payment setup unavailable" message={error} />
{:else}
	<div class="mb-6 flex flex-wrap items-center gap-3"><label class="text-sm">Utility<select class="ml-3 rounded-xl border border-slate-700 bg-slate-800 p-2" value={utilityId} onchange={(event) => window.location.assign(`/super-admin/payment-setup/${event.currentTarget.value}`)}>{#each utilities as utility}<option value={utility.id}>{utility.displayName}</option>{/each}</select></label><span class="rounded-full border border-slate-700 px-3 py-1 text-sm">{paymentState.config?.status ?? 'Not Configured'}</span><span class="text-xs text-slate-400">{selectedUtility?.slug}</span></div>
	{#if error}<div role="alert" class="mb-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div>{/if}
	{#if success}<div role="status" class="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{success}</div>{/if}
	<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
	<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 class="text-lg font-bold">Channel configuration</h2><p class="mt-2 text-sm text-slate-400">Store only a credential reference. Never paste API secrets into this form.</p>
		<div class="mt-5 grid gap-4 md:grid-cols-2">
			<label class="text-sm">Merchant ID<input class="field" bind:value={form.merchantId} /></label>
			<label class="text-sm">Credential reference<input class="field" bind:value={form.credentialRef} placeholder="local-sim://gcash" /></label>
			<label class="text-sm md:col-span-2">WebPay / checkout URL<input class="field" type="url" bind:value={form.checkoutUrl} /></label>
			<label class="text-sm md:col-span-2">HTTPS callback URL<input class="field" type="url" bind:value={form.callbackUrl} /></label>
			<label class="text-sm">Fee model<select class="field" bind:value={form.feeModel}><option value="fixed">Fixed PHP</option><option value="percentage">Percentage of bill</option></select></label>
			<label class="text-sm">Fee payer<select class="field" bind:value={form.feePayer}><option value="subscriber">Subscriber</option><option value="utility">Utility</option></select></label>
			<label class="text-sm">Transaction fee {form.feeModel === 'fixed' ? '(PHP)' : '(%)'}<input class="field" type="number" min="0" step="0.0001" bind:value={form.transactionFee} /></label>
			<label class="text-sm">Convenience fee {form.feeModel === 'fixed' ? '(PHP)' : '(%)'}<input class="field" type="number" min="0" step="0.0001" bind:value={form.convenienceFee} /></label>
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" bind:checked={form.vatEnabled} />Apply VAT to fees only ({paymentState.vatRatePercent}%)</label>
			<p class="text-xs text-slate-400">Approved cap: {form.feeModel === 'fixed' ? `₱${paymentState.maxFlatFeePHP} per fee` : `${paymentState.maxFeePercent}% per fee`}. Ask an operator to configure approved limits before using nonzero fees.</p>
			<label class="text-sm">Settlement bank / wallet reference<input class="field" bind:value={form.settlementDestination} placeholder="local-sim://settlement-wallet" /></label>
			<label class="text-sm">Settlement cycle<select class="field" bind:value={form.settlementCycle}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
		</div>
		<label class="mt-5 block text-sm">Reason for change<textarea class="field min-h-20" bind:value={form.reason}></textarea></label>
		<div class="mt-5 flex flex-wrap gap-3">
			<button class="rounded-xl bg-cyan-600 px-5 py-2.5 font-bold disabled:opacity-50" onclick={save} disabled={busy || !form.reason.trim()}>Save for testing</button>
			{#if paymentState.config && paymentState.config.status !== 'Disabled'}
				<button class="rounded-xl border border-rose-700 px-5 py-2.5 text-rose-200 disabled:opacity-50" disabled={busy || !form.reason.trim()} onclick={disable}>Disable setup</button>
			{/if}
		</div>
	</section>
	<div class="space-y-6"><section class="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 class="font-bold">Fee simulation</h2><label class="mt-4 block text-sm">Sample bill amount (PHP)<input class="field" type="number" min="0.01" step="0.01" bind:value={amount} /></label><button class="mt-4 rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-200 disabled:opacity-50" onclick={simulateFee} disabled={busy || !paymentState.config}>Calculate</button>{#if quote}<dl class="mt-4 grid grid-cols-2 gap-2 text-sm"><dt>Bill</dt><dd class="text-right">₱{quote.billAmount}</dd><dt>Transaction fee</dt><dd class="text-right">₱{quote.transactionFee}</dd><dt>Convenience fee</dt><dd class="text-right">₱{quote.convenienceFee}</dd><dt>VAT on fees</dt><dd class="text-right">₱{quote.vat}</dd><dt class="font-bold">Total fee</dt><dd class="text-right font-bold">₱{quote.totalFee}</dd><dt>Subscriber pays</dt><dd class="text-right">₱{quote.subscriberPays}</dd><dt>Utility receives</dt><dd class="text-right">₱{quote.utilityReceives}</dd></dl>{/if}</section>
		<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 class="font-bold">Simulated callback test</h2><p class="mt-2 text-xs text-slate-400">Uses the sample bill amount. Does not create a real GCash transaction or bill payment.</p><label class="mt-4 flex gap-2 text-sm"><input type="checkbox" bind:checked={forceFailure} />Simulate provider failure</label><button class="mt-4 rounded-xl border border-cyan-700 px-4 py-2 text-sm text-cyan-200 disabled:opacity-50" onclick={runTest} disabled={busy || !paymentState.testAvailable || !paymentState.config || paymentState.config.status === 'Disabled'}>Run test callback</button><p class="mt-3 text-xs text-slate-400">Last test: {paymentState.config?.lastTestStatus || 'None'} {paymentState.config?.lastTestAt ? new Date(paymentState.config.lastTestAt).toLocaleString() : ''}</p></section>
	</div></div>
	<section class="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 class="font-bold">Callback test logs</h2>{#if !logs.length}<p class="mt-3 text-sm text-slate-400">No callback tests yet.</p>{:else}<div class="mt-4 overflow-x-auto"><table class="w-full min-w-[650px] text-left text-sm"><thead class="text-xs uppercase text-slate-400"><tr><th class="p-2">When</th><th class="p-2">Result</th><th class="p-2">Amount</th><th class="p-2">Reference</th><th class="p-2">Revision</th></tr></thead><tbody>{#each logs as log}<tr class="border-t border-slate-800"><td class="p-2">{new Date(log.createdAt).toLocaleString()}</td><td class="p-2">{log.status}{log.failureCode ? ` · ${log.failureCode}` : ''}</td><td class="p-2">₱{log.amount}</td><td class="p-2 font-mono text-xs">{log.providerReference || '—'}</td><td class="p-2">{log.configRevision}</td></tr>{/each}</tbody></table></div>{/if}</section>
	<section class="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 class="font-bold">Finance alerts</h2>{#if !notices.length}<p class="mt-3 text-sm text-slate-400">No payment setup alerts.</p>{:else}<ul class="mt-3 space-y-3">{#each notices as notice}<li class="border-b border-slate-800 pb-3 text-sm"><span class="text-xs text-slate-500">{new Date(notice.createdAt).toLocaleString()}</span><p>{notice.message}</p></li>{/each}</ul>{/if}</section>
{/if}
</div>
