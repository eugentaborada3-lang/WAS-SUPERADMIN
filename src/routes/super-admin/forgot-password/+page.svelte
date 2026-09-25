<script lang="ts">
	import { platformService } from '$lib/platform/service';
	let email = $state('');
	let busy = $state(false);
	let done = $state(false);
	let error = $state('');
	async function submit(event: SubmitEvent) {
		event.preventDefault(); busy = true; error = '';
		try { await platformService.forgotPassword(email.trim()); done = true; }
		catch (e) { error = e instanceof Error ? e.message : 'Unable to submit request.'; }
		finally { busy = false; }
	}
</script>
<svelte:head><title>Reset platform password | WAS</title><meta name="referrer" content="no-referrer" /></svelte:head>
<main class="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-slate-100">
	<section class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
		<h1 class="text-2xl font-bold">Reset platform password</h1>
		{#if done}<p role="status" class="mt-5 text-sm text-emerald-300">If this account is eligible, a reset link will be sent.</p>
		{:else}<form class="mt-6 space-y-4" onsubmit={submit}>
			<label class="block text-sm">Email<input class="mt-2 w-full rounded-xl bg-slate-800 p-3" type="email" autocomplete="email" bind:value={email} required /></label>
			{#if error}<p role="alert" class="text-rose-300">{error}</p>{/if}
			<button class="w-full rounded-xl bg-cyan-600 p-3 font-bold disabled:opacity-50" disabled={busy}>Request reset</button>
		</form>{/if}
		<a href="/super-admin/login" class="mt-5 block text-sm text-cyan-300">Back to sign in</a>
	</section>
</main>
