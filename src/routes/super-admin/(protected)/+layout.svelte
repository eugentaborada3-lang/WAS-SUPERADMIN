<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { afterNavigate, goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import type { Snippet } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type {
		PlatformNotification,
		PlatformNotificationPreference,
		PlatformSearchResult,
		PlatformSession
	} from '$lib/platform/types';
	import wasLogo from '$lib/assets/favicon.svg';

	let { data, children } = $props<{
		data: { platformSession: PlatformSession };
		children: Snippet;
	}>();
	let menuOpen = $state(false);
	let sidebarCollapsed = $state(false);
	let navSearch = $state('');
	let commandOpen = $state(false);
	let commandQuery = $state('');
	let commandResults = $state<PlatformSearchResult[]>([]);
	let commandLoading = $state(false);
	let commandError = $state('');
	let commandTimer: ReturnType<typeof setTimeout> | undefined;
	let commandInput = $state<HTMLInputElement>();
	let recentLinks = $state<{ href: string; label: string }[]>([]);
	let signingOut = $state(false);
	let notificationsOpen = $state(false);
	let notificationsLoading = $state(false);
	let notificationsError = $state('');
	let notifications = $state<PlatformNotification[]>([]);
	let unreadNotifications = $state(0);
	let preferencesOpen = $state(false);
	let notificationPreferences = $state<PlatformNotificationPreference[]>([]);
	const notificationCategories = [
		'operations',
		'billing',
		'support',
		'reports',
		'security',
		'integrations'
	];

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

	async function loadNotificationPreferences() {
		try {
			notificationPreferences = await platformService.notificationPreferences();
		} catch (error) {
			notificationsError = error instanceof Error ? error.message : 'Unable to load preferences.';
		}
	}

	function preferenceEnabled(category: string) {
		return (
			notificationPreferences.find((preference) => preference.category === category)?.enabled ??
			true
		);
	}

	async function toggleNotificationPreference(category: string) {
		const enabled = !preferenceEnabled(category);
		try {
			await platformService.saveNotificationPreference(category, enabled);
			notificationPreferences = [
				...notificationPreferences.filter((preference) => preference.category !== category),
				{ category, enabled }
			];
		} catch (error) {
			notificationsError = error instanceof Error ? error.message : 'Unable to save preference.';
		}
	}

	const shellPreferenceKey = $derived(`was:platform:${data.platformSession.userId}:shell`);
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
	const commandLinks = $derived(
		visibleLinks.filter((link) => {
			const query = commandQuery.trim().toLowerCase();
			return !query || link.label.toLowerCase().includes(query);
		})
	);
	const currentPageLabel = $derived(
		links.find((link) => page.url.pathname.startsWith(link.href))?.label ?? 'Platform workspace'
	);

	function rememberLink(pathname: string) {
		const link = links.find((entry) => pathname.startsWith(entry.href));
		if (!link) return;
		recentLinks = [link, ...recentLinks.filter((entry) => entry.href !== link.href)].slice(0, 4);
		localStorage.setItem(`${shellPreferenceKey}:recent`, JSON.stringify(recentLinks.map((entry) => entry.href)));
	}

	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		localStorage.setItem(`${shellPreferenceKey}:collapsed`, String(sidebarCollapsed));
	}

	async function openCommandPalette() {
		commandQuery = '';
		commandResults = [];
		commandError = '';
		commandOpen = true;
		await tick();
		commandInput?.focus();
	}

	function closeCommandPalette() {
		commandOpen = false;
		commandQuery = '';
		commandResults = [];
		commandError = '';
	}

	function scheduleCommandSearch() {
		if (commandTimer) clearTimeout(commandTimer);
		commandError = '';
		const query = commandQuery.trim();
		if (query.length < 2) {
			commandResults = [];
			commandLoading = false;
			return;
		}
		commandLoading = true;
		commandTimer = setTimeout(async () => {
			try {
				commandResults = await platformService.search(query);
			} catch (error) {
				commandResults = [];
				commandError = error instanceof Error ? error.message : 'Search is unavailable.';
			} finally {
				commandLoading = false;
			}
		}, 250);
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			openCommandPalette();
		}
		if (event.key === 'Escape') {
			commandOpen = false;
			notificationsOpen = false;
			menuOpen = false;
		}
	}

	onMount(() => {
		void loadNotifications();
		sidebarCollapsed = localStorage.getItem(`${shellPreferenceKey}:collapsed`) === 'true';
		try {
			const stored = JSON.parse(localStorage.getItem(`${shellPreferenceKey}:recent`) ?? '[]') as string[];
			recentLinks = stored
				.map((href) => links.find((link) => link.href === href))
				.filter((link): link is { href: string; label: string } => Boolean(link))
				.slice(0, 4);
		} catch {
			recentLinks = [];
		}
		rememberLink(page.url.pathname);
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});

	afterNavigate(({ to }) => {
		if (to) rememberLink(to.url.pathname);
	});

	async function logout() {
		signingOut = true;
		try {
			await platformService.logout();
		} finally {
			await goto('/super-admin/login');
		}
	}
</script>

<div
	class="platform-portal-shell flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0b1424] text-slate-100"
>
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
			<div class="relative flex items-center gap-2 lg:gap-4">
				<span
					class="hidden rounded-full border border-slate-700 px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase lg:inline-flex"
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
							<div class="flex items-center gap-3">
								<button
									type="button"
									class="notification-toolbar-button"
									onclick={() => {
										preferencesOpen = !preferencesOpen;
										if (preferencesOpen) void loadNotificationPreferences();
									}}>Preferences</button
								><button
									type="button"
									class="notification-toolbar-button primary"
									onclick={markAllNotificationsRead}
									disabled={unreadNotifications === 0}>Mark all read</button
								>
							</div>
						</div>
						{#if preferencesOpen}<div class="grid grid-cols-2 gap-2 border-b border-slate-800 p-3">
								{#each notificationCategories as category}<label
										class="flex items-center gap-2 rounded-lg bg-slate-900/60 px-2 py-2 text-xs capitalize"
										><input
											type="checkbox"
											checked={preferenceEnabled(category)}
											disabled={category === 'security'}
											onchange={() => toggleNotificationPreference(category)}
										/>{category}</label
									>{/each}
								<p class="col-span-2 text-[10px] text-slate-500">
									Security notifications are mandatory. These settings affect in-app notices only.
								</p>
							</div>{/if}
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
										href={notification.destinationPath || '/super-admin/audit'}
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
											{notification.category} · {new Date(notification.createdAt).toLocaleString()}
										</p></a
									>{/each}
							</div>{/if}
					</div>
				{/if}
			</div>
		</div>
	</header>
	<div
		class={`relative mx-auto grid min-h-0 w-full max-w-screen-2xl flex-1 overflow-hidden ${sidebarCollapsed ? 'lg:grid-cols-[80px_1fr]' : 'lg:grid-cols-[272px_1fr]'}`}
	>
		<aside
			class={`absolute inset-0 z-20 min-h-0 flex-col overflow-hidden border-slate-800/80 bg-[#101b2d] p-4 lg:static lg:flex lg:h-full lg:border-r ${menuOpen ? 'flex' : 'hidden'}`}
		>
			<div class={`shrink-0 px-4 pt-2 pb-3 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
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
				<button type="button" class="command-trigger mb-3" onclick={openCommandPalette} aria-keyshortcuts="Control+K Meta+K"><span aria-hidden="true">⌕</span><span class={sidebarCollapsed ? 'lg:hidden' : ''}>Search records and pages</span><kbd class={sidebarCollapsed ? 'lg:hidden' : ''}>Ctrl K</kbd></button>
				<label class={`portal-search mb-3 ${sidebarCollapsed ? 'lg:hidden' : ''}`} aria-label="Search platform navigation">
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
						><span class={`w-7 shrink-0 text-center text-[10px] font-bold tracking-wide ${sidebarCollapsed ? 'hidden lg:inline' : 'hidden'}`} aria-hidden="true">{link.label.slice(0, 2).toUpperCase()}</span><span class={sidebarCollapsed ? 'lg:hidden' : ''}>{link.label}</span></a
					>
				{/each}
				{#if visibleLinks.length === 0}<p class="px-3 py-5 text-center text-xs text-slate-500">
						No matching pages
					</p>{/if}
				{#if recentLinks.length > 1 && !sidebarCollapsed}<div class="mt-4 border-t border-slate-800 pt-3"><p class="px-3 text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">Recent</p>{#each recentLinks.slice(1) as link}<a class="recent-link" href={link.href} onclick={() => (menuOpen = false)}>{link.label}</a>{/each}</div>{/if}
			</nav>
			<div class="mt-4 shrink-0 border-t border-slate-800 pt-4">
				<p class={`truncate px-3 text-sm font-semibold ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{data.platformSession.name}</p>
				<p class={`mt-0.5 px-3 text-xs text-slate-400 capitalize ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
					{data.platformSession.role.replaceAll('-', ' ')}
				</p>
				<button
					class={`mt-3 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm transition hover:border-rose-500 hover:text-rose-300 disabled:opacity-60 ${sidebarCollapsed ? 'lg:hidden' : ''}`}
					disabled={signingOut}
					onclick={logout}>{signingOut ? 'Signing out…' : 'Sign out'}</button
				>
				<button type="button" class="sidebar-collapse-button mt-3 hidden lg:flex" onclick={toggleSidebar} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{sidebarCollapsed ? '›' : '‹'}</button>
			</div>
		</aside>
		<main class="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto bg-[#08111f] p-4 sm:p-7 lg:p-9" aria-label={currentPageLabel}>
			{@render children()}
		</main>
	</div>
</div>

{#if commandOpen}
	<div class="command-backdrop">
		<button type="button" class="command-dismiss" onclick={closeCommandPalette} aria-label="Close command search"></button>
		<div class="command-palette" role="dialog" aria-modal="true" aria-label="Search records and pages">
			<div class="command-input-row"><span aria-hidden="true">⌕</span><input bind:this={commandInput} bind:value={commandQuery} oninput={scheduleCommandSearch} type="search" placeholder="Search utilities, users, support cases, or pages…" aria-label="Search permitted records and pages" /><kbd>Esc</kbd></div>
			<p class="command-scope-note">Results are limited by your platform role and server permissions. Enter at least two characters to search records.</p>
			<div class="command-results" role="listbox" aria-label="Search results">
				{#each commandLinks as link}<a href={link.href} role="option" aria-selected="false" onclick={closeCommandPalette}><span><strong>{link.label}</strong><small>Platform navigation</small></span><span aria-hidden="true">↵</span></a>{/each}
				{#if commandLoading}<p role="status">Searching permitted records…</p>{:else if commandError}<p role="alert">{commandError} Try again by changing the search.</p>{:else}{#each commandResults as result (result.type + result.id)}<a href={result.path} role="option" aria-selected="false" onclick={closeCommandPalette}><span><strong>{result.title}</strong><small>{result.type} · {result.description}</small></span><span aria-hidden="true">↵</span></a>{/each}{/if}
				{#if commandLinks.length === 0 && commandResults.length === 0 && !commandLoading && !commandError}<p>{commandQuery.trim().length < 2 ? 'Type at least two characters to search records.' : `No permitted results match “${commandQuery}”.`}</p>{/if}
			</div>
		</div>
	</div>
{/if}
