<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformNotification, PlatformSession } from '$lib/platform/types';
	import wasLogo from '$lib/assets/favicon.svg';

	let { data, children } = $props<{
		data: { platformSession: PlatformSession };
		children: Snippet;
	}>();
	let menuOpen = $state(false);
	let navSearch = $state('');
	let signingOut = $state(false);
	let notificationsOpen = $state(false);
	let notificationsLoading = $state(false);
	let notificationsError = $state('');
	let notifications = $state<PlatformNotification[]>([]);
	let unreadNotifications = $state(0);

	async function loadNotifications() {
		notificationsLoading = true;
		notificationsError = '';
		try {
			const result = await platformService.notifications();
			notifications = result.items;
			unreadNotifications = result.unread;
		} catch (error) {
			notificationsError = error instanceof Error ? error.message : 'Unable to load notifications.';
		} finally {
			notificationsLoading = false;
		}
	}

	async function markNotificationRead(notification: PlatformNotification) {
		if (notification.readAt) return;
		try {
			await platformService.markNotificationRead(notification.id);
			notification.readAt = new Date().toISOString();
			unreadNotifications = Math.max(0, unreadNotifications - 1);
		} catch (error) {
			notificationsError =
				error instanceof Error ? error.message : 'Unable to update notification.';
		}
	}

	async function markAllNotificationsRead() {
		try {
			await platformService.markAllNotificationsRead();
			notifications = notifications.map((notification) => ({
				...notification,
				readAt: notification.readAt ?? new Date().toISOString()
			}));
			unreadNotifications = 0;
		} catch (error) {
			notificationsError =
				error instanceof Error ? error.message : 'Unable to update notifications.';
		}
	}

	onMount(() => {
		void loadNotifications();
	});
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
				(link.href !== '/super-admin/payment-setup' ||
					['super-admin', 'finance-admin'].includes(data.platformSession.role)) &&
				(link.href !== '/super-admin/transactions' ||
					['super-admin', 'finance-admin', 'operations-admin'].includes(
						data.platformSession.role
					)) &&
				(link.href !== '/super-admin/monitoring' ||
					['super-admin', 'operations-admin'].includes(data.platformSession.role)) &&
				(link.href !== '/super-admin/reports' || data.platformSession.role !== 'support-agent') &&
				(link.href !== '/super-admin/support' || data.platformSession.role !== 'finance-admin') &&
				(link.href !== '/super-admin/audit' || data.platformSession.role !== 'support-agent') &&
				(!['/super-admin/users', '/super-admin/utility-users', '/super-admin/roles'].includes(
					link.href
				) ||
					['super-admin', 'operations-admin'].includes(data.platformSession.role))
		)
	);
	const visibleLinks = $derived(
		links.filter(
			(link) =>
				!navSearch.trim() || link.label.toLowerCase().includes(navSearch.trim().toLowerCase())
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
		<div
			class="mx-auto flex min-h-20 max-w-screen-2xl items-center justify-between gap-4 px-4 lg:px-8"
		>
			<a href="/super-admin/dashboard" class="flex min-w-0 items-center gap-3">
				<img src={wasLogo} alt="" class="h-10 w-10 rounded-xl" />
				<span class="min-w-0"
					><strong class="block truncate text-sm font-semibold tracking-wide"
						>Water Assistant System</strong
					><small class="text-slate-400">Platform administration</small></span
				>
			</a>
			<button
				class="rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-cyan-500 lg:hidden"
				onclick={() => (menuOpen = !menuOpen)}
				aria-expanded={menuOpen}>Menu</button
			>
			<div class="relative hidden items-center gap-4 lg:flex">
				<span
					class="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase"
					>Platform portal</span
				>
				<button
						type="button"
						onclick={() => {
							notificationsOpen = !notificationsOpen;
							if (notificationsOpen) void loadNotifications();
						}}
						class="relative rounded-xl border border-slate-700/80 bg-slate-900/50 p-2.5 text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-amber-200"
						aria-label={`Open alerts and activity${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
						aria-expanded={notificationsOpen}
						title="Alerts and activity"
					>
						<svg
							class="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.8"
								d="M14.857 17.082a23.848 23.848 0 0 1-5.714 0M18 8.25a6 6 0 1 0-12 0c0 7-3 7-3 9.75h18C21 15.25 18 15.25 18 8.25ZM10 20.25h4"
							/>
						</svg>
						{#if unreadNotifications > 0}<span
								class="absolute -top-1 -right-1 min-w-5 rounded-full bg-amber-300 px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-950"
								aria-label={`${unreadNotifications} unread notifications`}
								>{unreadNotifications > 99 ? '99+' : unreadNotifications}</span
							>{/if}
					</button>
				{#if notificationsOpen}
						<div
							class="absolute top-12 right-0 z-50 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-700 bg-[#101b2d] shadow-2xl"
							role="dialog"
							aria-label="Notifications"
						>
							<div class="flex items-center justify-between border-b border-slate-800 px-4 py-3">
								<div>
									<p class="text-sm font-semibold text-slate-100">Notifications</p>
									<p class="text-[11px] text-slate-400">{unreadNotifications} unread</p>
								</div>
								<button
									type="button"
									class="text-xs text-cyan-300 hover:text-cyan-200"
									onclick={markAllNotificationsRead}
									disabled={unreadNotifications === 0}>Mark all read</button
								>
							</div>
							{#if notificationsLoading}<p class="px-4 py-8 text-center text-xs text-slate-400">
									Loading notifications…
								</p>{:else if notificationsError}<div class="space-y-3 px-4 py-5">
									<p class="text-xs text-rose-300">{notificationsError}</p>
									<button
										type="button"
										class="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200"
										onclick={loadNotifications}>Try again</button
									>
								</div>{:else if notifications.length === 0}<p
									class="px-4 py-8 text-center text-xs text-slate-400"
								>
									No recent notifications.
								</p>{:else}<div class="max-h-80 overflow-y-auto">
									{#each notifications as notification (notification.id)}<a
											href="/super-admin/audit"
											class={`block border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-900/70 ${notification.readAt ? 'opacity-65' : ''}`}
											onclick={() => markNotificationRead(notification)}
											><div class="flex items-start justify-between gap-3">
												<p class="text-sm font-semibold text-slate-100">{notification.title}</p>
												<span
													class={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${notification.severity === 'critical' ? 'bg-rose-500/15 text-rose-300' : notification.severity === 'warning' ? 'bg-amber-500/15 text-amber-300' : 'bg-cyan-500/15 text-cyan-300'}`}
													>{notification.severity}</span
												>
											</div>
											<p class="mt-1 text-xs leading-5 text-slate-400">{notification.message}</p>
											<p class="mt-2 text-[10px] text-slate-500">
												{new Date(notification.createdAt).toLocaleString()}
											</p></a
										>{/each}
								</div>{/if}
						</div>
				{/if}
			</div>
		</div>
	</header>
	<div
		class="relative mx-auto grid min-h-0 w-full max-w-screen-2xl flex-1 overflow-hidden lg:grid-cols-[272px_1fr]"
	>
		<aside
			class={`absolute inset-0 z-20 min-h-0 flex-col overflow-hidden border-slate-800/80 bg-[#101b2d] p-4 lg:static lg:flex lg:h-full lg:border-r ${menuOpen ? 'flex' : 'hidden'}`}
		>
			<div class="shrink-0 px-4 pt-2 pb-3">
				<p class="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
					Platform workspace
				</p>
				<p class="mt-1 text-xs leading-5 text-slate-400">
					Administration and operational oversight
				</p>
			</div>
			<nav
				aria-label="Platform navigation"
				class="platform-nav-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1"
			>
				<label class="portal-search mb-3" aria-label="Search platform navigation">
					<svg
						class="h-4 w-4 shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
						><circle cx="11" cy="11" r="7" stroke-width="2" /><path
							stroke-linecap="round"
							stroke-width="2"
							d="m20 20-4-4"
						/></svg
					>
					<input bind:value={navSearch} type="search" placeholder="Search navigation" />
				</label>
				{#each visibleLinks as link}
					<a
						href={link.href}
						aria-current={page.url.pathname.startsWith(link.href) ? 'page' : undefined}
						onclick={() => (menuOpen = false)}
						class={`block rounded-lg px-4 py-2.5 text-[13px] font-medium transition ${page.url.pathname.startsWith(link.href) ? 'bg-cyan-500/10 text-cyan-100 ring-1 ring-cyan-400/30 ring-inset' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
						>{link.label}</a
					>
				{/each}
				{#if visibleLinks.length === 0}<p class="px-3 py-5 text-center text-xs text-slate-500">
						No matching pages
					</p>{/if}
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
		<main class="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto p-4 sm:p-7 lg:p-9">
			{@render children()}
		</main>
	</div>
</div>
