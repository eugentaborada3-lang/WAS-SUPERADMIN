<script lang="ts">
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	let token = $state('');
	let password = $state('');
	let confirm = $state('');
	let busy = $state(false);
	let done = $state(false);
	let error = $state('');
	onMount(() => { const hash = new URLSearchParams(location.hash.slice(1)); token = hash.get('token') ?? ''; history.replaceState(null, '', location.pathname); });
	async function submit(event: SubmitEvent) {
		event.preventDefault(); if (password !== confirm) { error = 'Passwords do not match.'; return; }
		busy = true; error = '';
		try { await platformService.setPassword(token, password, false); done = true; token = ''; password = ''; confirm = ''; }
		catch (e) { error = e instanceof Error ? e.message : 'Reset link is invalid or expired.'; }
		finally { busy = false; }
	}
</script>
<svelte:head><title>Set platform password | WAS</title><meta name="referrer" content="no-referrer" /></svelte:head>
<main class="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-slate-100"><section class="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
	<h1 class="text-2xl font-bold">Set a new password</h1>
	{#if done}<p role="status" class="mt-5 text-emerald-300">Password changed. Existing sessions were revoked; sign in again with MFA.</p>
	{:else if !token}<p class="mt-5 text-rose-300">Reset link is missing or expired.</p>
	{:else}<form class="mt-6 space-y-4" onsubmit={submit}>
		<label class="block text-sm">New password<input class="mt-2 w-full rounded-xl bg-slate-800 p-3" type="password" autocomplete="new-password" minlength="12" bind:value={password} required /></label>
		<label class="block text-sm">Confirm password<input class="mt-2 w-full rounded-xl bg-slate-800 p-3" type="password" autocomplete="new-password" minlength="12" bind:value={confirm} required /></label>
		{#if error}<p role="alert" class="text-rose-300">{error}</p>{/if}
		<button class="w-full rounded-xl bg-cyan-600 p-3 font-bold disabled:opacity-50" disabled={busy}>Change password</button>
	</form>{/if}
	<a href="/super-admin/login" class="mt-5 block text-sm text-cyan-300">Go to sign in</a>
</section></main>
