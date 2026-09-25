<script lang="ts">
	import { goto } from '$app/navigation';
	import { platformService } from '$lib/platform/service';
	import type { UtilityOnboardingInput } from '$lib/platform/types';
	let step = $state(1);
	let submitting = $state(false);
	let errorMessage = $state('');
	let form = $state<UtilityOnboardingInput>({
		slug: '',
		legalName: '',
		displayName: '',
		utilityType: 'Water District',
		officeAddress: '',
		primaryContactName: '',
		primaryContactPhone: '',
		primaryContactEmail: '',
		enabledModules: ['customers', 'meters', 'readings', 'billing', 'payments'],
		status: 'Onboarding',
		currency: 'PHP',
		timezone: 'Asia/Manila',
		initialAdminName: '',
		initialAdminUsername: '',
		initialAdminEmail: '',
		initialAdminPassword: ''
	});
	const modules = [
		'customers',
		'meters',
		'readings',
		'billing',
		'payments',
		'support',
		'reports',
		'advisories'
	];
	function next() {
		errorMessage = '';
		if (step === 1 && (!form.slug || !form.legalName || !form.displayName || !form.officeAddress))
			errorMessage = 'Complete the required organization fields.';
		else if (
			step === 2 &&
			(!form.primaryContactName || !form.primaryContactEmail || form.enabledModules.length === 0)
		)
			errorMessage = 'Add a primary contact and choose at least one module.';
		else if (
			step === 3 &&
			(!form.initialAdminName ||
				!form.initialAdminUsername ||
				!form.initialAdminEmail ||
				form.initialAdminPassword.length < 12)
		)
			errorMessage =
				'Complete the administrator fields. The temporary password must be at least 12 characters.';
		else step = Math.min(4, step + 1);
	}
	async function submit() {
		submitting = true;
		errorMessage = '';
		try {
			const utility = await platformService.onboardUtility(form);
			await goto(`/super-admin/utilities/${utility.id}`);
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Utility onboarding failed.';
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head><title>Onboard utility | WAS Platform</title></svelte:head>
<header class="mb-7">
	<a href="/super-admin/utilities" class="text-sm text-cyan-400">← Utilities</a>
	<h1 class="mt-3 text-3xl font-bold">Onboard a utility</h1>
	<p class="mt-2 text-slate-400">
		Creates the tenant, defaults, initial utility administrator, and audit trail in one transaction.
	</p>
</header>
<ol class="mb-7 grid grid-cols-4 gap-2 text-center text-xs">
	{#each ['Organization', 'Contact & modules', 'Administrator', 'Review'] as label, index}<li
			class="rounded-lg border px-2 py-3"
			class:border-cyan-500={step === index + 1}
			class:bg-cyan-950={step === index + 1}
			class:border-slate-800={step !== index + 1}
		>
			{index + 1}. {label}
		</li>{/each}
</ol>
<section class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
	{#if errorMessage}<div
			role="alert"
			class="mb-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200"
		>
			{errorMessage}
		</div>{/if}
	{#if step === 1}<div class="grid gap-5 md:grid-cols-2">
			<label class="text-sm font-semibold"
				>Legal name *<input class="field" bind:value={form.legalName} /></label
			><label class="text-sm font-semibold"
				>Display name *<input class="field" bind:value={form.displayName} /></label
			><label class="text-sm font-semibold"
				>URL slug *<input
					class="field"
					bind:value={form.slug}
					pattern="[a-z0-9-]+"
					placeholder="metro-water"
				/></label
			><label class="text-sm font-semibold"
				>Utility type *<select class="field" bind:value={form.utilityType}
					><option>Water District</option><option>Municipal Utility</option><option
						>Private Utility</option
					><option>Cooperative</option></select
				></label
			><label class="text-sm font-semibold md:col-span-2"
				>Office address *<textarea class="field min-h-24" bind:value={form.officeAddress}
				></textarea></label
			>
		</div>
	{:else if step === 2}<div class="grid gap-5 md:grid-cols-2">
			<label class="text-sm font-semibold"
				>Contact name *<input class="field" bind:value={form.primaryContactName} /></label
			><label class="text-sm font-semibold"
				>Contact email *<input
					class="field"
					type="email"
					bind:value={form.primaryContactEmail}
				/></label
			><label class="text-sm font-semibold"
				>Contact phone<input class="field" bind:value={form.primaryContactPhone} /></label
			><label class="text-sm font-semibold"
				>Initial status<select class="field" bind:value={form.status}
					><option>Onboarding</option><option>Active</option><option>Migration Review</option
					></select
				></label
			>
			<fieldset class="md:col-span-2">
				<legend class="text-sm font-semibold">Enabled modules *</legend>
				<div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{#each modules as module}<label
							class="flex gap-2 rounded-xl border border-slate-700 p-3 text-sm capitalize"
							><input
								type="checkbox"
								bind:group={form.enabledModules}
								value={module}
							/>{module}</label
						>{/each}
				</div>
			</fieldset>
		</div>
	{:else if step === 3}<div class="grid gap-5 md:grid-cols-2">
			<label class="text-sm font-semibold"
				>Administrator name *<input class="field" bind:value={form.initialAdminName} /></label
			><label class="text-sm font-semibold"
				>Username *<input class="field" bind:value={form.initialAdminUsername} /></label
			><label class="text-sm font-semibold"
				>Email *<input class="field" type="email" bind:value={form.initialAdminEmail} /></label
			><label class="text-sm font-semibold"
				>Temporary password *<input
					class="field"
					type="password"
					minlength="12"
					bind:value={form.initialAdminPassword}
				/></label
			>
			<p
				class="rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100/80 md:col-span-2"
			>
				Email delivery is not configured. Share the temporary password through an approved secure
				channel and require rotation operationally.
			</p>
		</div>
	{:else}<dl class="grid gap-4 text-sm sm:grid-cols-2">
			<div>
				<dt class="text-slate-500">Utility</dt>
				<dd class="font-semibold">{form.displayName} ({form.slug})</dd>
			</div>
			<div>
				<dt class="text-slate-500">Status</dt>
				<dd>{form.status}</dd>
			</div>
			<div>
				<dt class="text-slate-500">Primary contact</dt>
				<dd>{form.primaryContactName} · {form.primaryContactEmail}</dd>
			</div>
			<div>
				<dt class="text-slate-500">Initial administrator</dt>
				<dd>{form.initialAdminName} · {form.initialAdminEmail}</dd>
			</div>
			<div class="sm:col-span-2">
				<dt class="text-slate-500">Modules</dt>
				<dd class="capitalize">{form.enabledModules.join(', ')}</dd>
			</div>
		</dl>{/if}
	<div class="mt-8 flex justify-between">
		<button
			type="button"
			class="rounded-xl border border-slate-700 px-4 py-2 disabled:opacity-40"
			disabled={step === 1 || submitting}
			onclick={() => step--}>Back</button
		>{#if step < 4}<button
				type="button"
				class="rounded-xl bg-cyan-600 px-5 py-2 font-bold"
				onclick={next}>Continue</button
			>{:else}<button
				type="button"
				class="rounded-xl bg-cyan-600 px-5 py-2 font-bold disabled:opacity-50"
				onclick={submit}
				disabled={submitting}>{submitting ? 'Creating utility…' : 'Confirm and create'}</button
			>{/if}
	</div>
</section>

<style>
	.field {
		margin-top: 0.5rem;
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
