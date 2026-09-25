<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformSession } from '$lib/platform/types';

	let { data, children } = $props<{
		data: { platformSession: PlatformSession };
		children: Snippet;
	}>();
	let menuOpen = $state(false);
	let signingOut = $state(false);
	const links = $derived(
		[
			{ href: '/super-admin/dashboard', label: 'Overview' },
			{ href: '/super-admin/utilities', label: 'Utilities' },
			{ href: '/super-admin/payment-setup', label: 'Payment setup' },
			{ href: '/super-admin/users', label: 'Platform users' },
			{ href: '/super-admin/roles', label: 'Roles & permissions' },
			{ href: '/super-admin/audit', label: 'Audit logs' },
			{ href: '/super-admin/security', label: 'My security' }
		].filter(
			(link) =>
				(link.href !== '/super-admin/payment-setup' || ['super-admin','finance-admin'].includes(data.platformSession.role)) &&
				(!['/super-admin/users', '/super-admin/roles'].includes(link.href) ||
				['super-admin', 'operations-admin', 'support-agent'].includes(data.platformSession.role))
		)
	);

	async function logout() {
		signingOut = true;
		try {
			await platformService.logout();
		} finally {
			await goto('/super-admin/login');
		}
	}
</script>

<div class="min-h-screen bg-slate-950 text-slate-100">
	<header class="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
		<div class="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 lg:px-8">
			<a href="/super-admin/dashboard" class="flex items-center gap-3"
				><span class="grid h-9 w-9 place-items-center rounded-xl bg-cyan-600 font-black">W</span
				><span
					><strong class="block text-sm">Water Assistant System</strong><small
						class="text-slate-400">Platform administration</small
					></span
				></a
			>
			<button
				class="rounded-lg border border-slate-700 px-3 py-2 text-sm lg:hidden"
				onclick={() => (menuOpen = !menuOpen)}
				aria-expanded={menuOpen}>Menu</button
			>
			<div class="hidden items-center gap-4 lg:flex">
				<span
					class="rounded-full border border-slate-700 px-2 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase"
					>{import.meta.env.DEV ? 'Development' : 'Production'}</span
				>
				<a href="/super-admin/audit" class="text-xs text-amber-300">Alerts & activity</a>
				<div class="text-right">
					<p class="text-sm font-semibold">{data.platformSession.name}</p>
					<p class="text-xs text-slate-400 capitalize">
						{data.platformSession.role.replaceAll('-', ' ')}
					</p>
				</div>
				<button
					class="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:border-rose-500 hover:text-rose-300"
					onclick={logout}
					disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button
				>
			</div>
		</div>
	</header>
	<div class="mx-auto grid max-w-screen-2xl lg:grid-cols-[250px_1fr]">
		<aside
			class={`border-slate-800 bg-slate-900/40 p-4 lg:block lg:min-h-[calc(100vh-65px)] lg:border-r ${menuOpen ? 'block border-b' : 'hidden'}`}
		>
			<nav aria-label="Platform navigation" class="space-y-1">
				{#each links as link}
					<a
						href={link.href}
						class="block rounded-xl px-4 py-3 text-sm font-semibold transition"
						class:bg-cyan-950={page.url.pathname.startsWith(link.href)}
						class:text-cyan-300={page.url.pathname.startsWith(link.href)}
						class:text-slate-400={!page.url.pathname.startsWith(link.href)}
						class:hover:bg-slate-800={!page.url.pathname.startsWith(link.href)}>{link.label}</a
					>
				{/each}
			</nav>
			<div class="mt-6 border-t border-slate-800 pt-5 lg:hidden">
				<p class="px-4 text-sm font-semibold">{data.platformSession.name}</p>
				<p class="px-4 text-xs text-slate-400 capitalize">
					{data.platformSession.role.replaceAll('-', ' ')}
				</p>
				<button
					class="mt-4 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm"
					onclick={logout}>Sign out</button
				>
			</div>
		</aside>
		<main class="min-w-0 p-5 lg:p-8">{@render children()}</main>
	</div>
</div>
