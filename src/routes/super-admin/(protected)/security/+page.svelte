<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>My security | WAS Platform</title></svelte:head>
<header class="mb-7">
	<p class="text-xs font-bold tracking-[0.2em] text-cyan-400">ACCOUNT SECURITY</p>
	<h1 class="mt-2 text-3xl font-bold">My security</h1>
</header>
<section class="max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
	<h2 class="text-lg font-bold">Authenticator MFA</h2>
	<p class="mt-3 text-sm text-emerald-300">{page.data.platformSession?.mfaEnabled ? 'Enabled and required for every sign-in.' : 'MFA enrollment is required at sign-in.'}</p>
	<p class="mt-2 text-sm text-slate-400">If you lose your authenticator, use a saved recovery code. If both are unavailable, ask another Super Admin for a documented MFA reset. All sessions are revoked by a reset.</p>
</section>
