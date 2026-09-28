<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformSession } from '$lib/platform/types';
	import wasLogo from '$lib/assets/favicon.svg';

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
			{ href: '/super-admin/transactions', label: 'Utility payments' },
			{ href: '/super-admin/monitoring', label: 'System monitoring' },
			{ href: '/super-admin/reports', label: 'Platform reports' },
			{ href: '/super-admin/support', label: 'Support cases' },
			{ href: '/super-admin/users', label: 'Platform users' },
			{ href: '/super-admin/utility-users', label: 'Utility users' },
			{ href: '/super-admin/roles', label: 'Roles & permissions' },
			{ href: '/super-admin/audit', label: 'Audit logs' },
			{ href: '/super-admin/security', label: 'My security' }
		].filter(
			(link) =>
				(link.href !== '/super-admin/payment-setup' || ['super-admin','finance-admin'].includes(data.platformSession.role)) &&
				(link.href !== '/super-admin/transactions' || ['super-admin','finance-admin','operations-admin'].includes(data.platformSession.role)) &&
				(link.href !== '/super-admin/monitoring' || ['super-admin','operations-admin'].includes(data.platformSession.role)) &&
				(link.href !== '/super-admin/reports' || data.platformSession.role !== 'support-agent') &&
				(link.href !== '/super-admin/support' || data.platformSession.role !== 'finance-admin') &&
				(link.href !== '/super-admin/audit' || data.platformSession.role !== 'support-agent') &&
				(!['/super-admin/users', '/super-admin/utility-users', '/super-admin/roles'].includes(link.href) ||
				['super-admin', 'operations-admin'].includes(data.platformSession.role))
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

<div class="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0b1424] text-slate-100">
	<header class="z-30 shrink-0 border-b border-slate-800/80 bg-[#101b2d]/95 backdrop-blur">
		<div class="mx-auto flex min-h-20 max-w-screen-2xl items-center justify-between gap-4 px-4 lg:px-8">
			<a href="/super-admin/dashboard" class="flex min-w-0 items-center gap-3">
				<img src={wasLogo} alt="" class="h-10 w-10 rounded-xl" />
				<span class="min-w-0"><strong class="block truncate text-sm font-semibold tracking-wide">Water Assistant System</strong><small class="text-slate-400">Platform administration</small></span>
			</a>
			<button
				class="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-cyan-500 lg:hidden"
				onclick={() => (menuOpen = !menuOpen)}
				aria-expanded={menuOpen}>Menu</button
			>
			<div class="hidden items-center gap-4 lg:flex">
				<span class="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">Platform portal</span>
				{#if data.platformSession.role !== 'support-agent'}<a href="/super-admin/audit" class="text-xs text-amber-300">Alerts & activity</a>{/if}
			</div>
		</div>
	</header>
	<div class="relative mx-auto grid min-h-0 w-full max-w-screen-2xl flex-1 overflow-hidden lg:grid-cols-[272px_1fr]">
		<aside
			class={`absolute inset-0 z-20 min-h-0 flex-col overflow-hidden border-slate-800/80 bg-[#101b2d] p-4 lg:static lg:flex lg:h-full lg:border-r ${menuOpen ? 'flex' : 'hidden'}`}
		>
			<div class="shrink-0 px-4 pb-3 pt-2">
				<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Platform workspace</p>
				<p class="mt-1 text-xs leading-5 text-slate-400">Administration and operational oversight</p>
			</div>
			<nav aria-label="Platform navigation" class="platform-nav-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
				{#each links as link}
					<a
						href={link.href}
						aria-current={page.url.pathname.startsWith(link.href) ? 'page' : undefined}
						onclick={() => (menuOpen = false)}
						class={`block rounded-lg px-4 py-2.5 text-[13px] font-medium transition ${page.url.pathname.startsWith(link.href) ? 'bg-cyan-500/10 text-cyan-100 ring-1 ring-inset ring-cyan-400/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>{link.label}</a
					>
				{/each}
			</nav>
			<div class="mt-4 shrink-0 border-t border-slate-800 pt-4">
				<p class="truncate px-3 text-sm font-semibold">{data.platformSession.name}</p>
				<p class="mt-0.5 px-3 text-xs text-slate-400 capitalize">
					{data.platformSession.role.replaceAll('-', ' ')}
				</p>
				<button
					class="mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-rose-500 hover:text-rose-300 disabled:opacity-60"
					disabled={signingOut}
					onclick={logout}>{signingOut ? 'Signing out…' : 'Sign out'}</button
				>
			</div>
		</aside>
		<main class="min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-7 lg:p-9">{@render children()}</main>
	</div>
</div>
