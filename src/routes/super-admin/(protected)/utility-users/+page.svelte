<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformPage, PlatformUtilityUser } from '$lib/platform/types';

	let result = $state<PlatformPage<PlatformUtilityUser> | null>(null);
	let loading = $state(true);
	let busy = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let tenantId = $state('');
	let search = $state('');
	let status = $state('');
	let pageNumber = $state(1);
	let selected = $state<PlatformUtilityUser | null>(null);
	let reason = $state('');
	const canManage = $derived(page.data.platformSession?.role === 'super-admin');

	async function load(event?: SubmitEvent) {
		event?.preventDefault();
		loading = true; errorMessage = '';
		try { result = await platformService.utilityUsers({ tenantId: tenantId.trim(), search: search.trim(), status, page: pageNumber, pageSize: 20 }); }
		catch (error) { result = null; errorMessage = error instanceof Error ? error.message : 'Unable to load utility users.'; }
		finally { loading = false; }
	}

	function apply(event: SubmitEvent) { pageNumber = 1; void load(event); }
	function movePage(next: number) { pageNumber = next; void load(); }

	async function changeStatus() {
		if (!selected || !reason.trim()) { errorMessage = 'Enter a reason for the status change.'; return; }
		const next = selected.status === 'Active' ? 'Disabled' : 'Active';
		if (!confirm(`${next === 'Disabled' ? 'Disable' : 'Reactivate'} ${selected.fullName} in utility #${selected.tenantId}?`)) return;
		busy = true; errorMessage = ''; successMessage = '';
		try {
			await platformService.changeUtilityUserStatus(selected.tenantId, selected.id, next, reason);
			selected = null; reason = '';
			successMessage = 'Utility-user status changed and audited. Existing sessions were revoked when disabled.';
			await load();
		} catch (error) { errorMessage = error instanceof Error ? error.message : 'Unable to change account status.'; }
		finally { busy = false; }
	}

	onMount(() => { void load(); });
</script>

<svelte:head><title>Utility users | Water Assistant System</title></svelte:head>
<header class="mb-6"><p class="text-xs font-bold tracking-[.2em] text-cyan-400 uppercase">Access management</p><h1 class="mt-2 text-3xl font-bold">Utility users</h1><p class="mt-2 text-sm text-slate-400">These tenant-scoped identities are separate from GoodApps platform users.</p></header>
<div class="mb-6 rounded-xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-100">Utility-user invitations and editable role templates are not available yet. Existing accounts require verified email before password recovery. Account status changes here do not send an email notice.</div>
{#if errorMessage}<p role="alert" class="mb-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200">{errorMessage}</p>{/if}
{#if successMessage}<p role="status" class="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{successMessage}</p>{/if}
<form onsubmit={apply} class="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_1fr_1fr_auto]"><label class="text-sm">Search<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={search} maxlength="191" /></label><label class="text-sm">Utility ID<input class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" type="text" inputmode="numeric" bind:value={tenantId} /></label><label class="text-sm">Status<select class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={status}><option value="">All</option><option>Active</option><option>Disabled</option></select></label><button class="self-end rounded-lg border border-cyan-700 px-4 py-2 text-cyan-300 disabled:opacity-50" disabled={loading}>Apply</button></form>
{#if loading}<p role="status" class="mt-6 rounded-xl border border-slate-800 p-6">Loading utility users…</p>{:else if result}
	{#if result.items.length === 0}<p class="mt-6 rounded-xl border border-slate-800 p-6 text-slate-400">No utility users match these filters.</p>{:else}<div class="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900"><table class="w-full min-w-[850px] text-left text-sm"><thead class="border-b border-slate-800 text-slate-400"><tr><th class="p-4">Name</th><th class="p-4">Utility</th><th class="p-4">Role</th><th class="p-4">Email</th><th class="p-4">Verified</th><th class="p-4">Status</th><th class="p-4">Last login</th><th class="p-4">Action</th></tr></thead><tbody>{#each result.items as user (user.id)}<tr class="border-b border-slate-800 last:border-0"><td class="p-4"><strong>{user.fullName}</strong><br /><span class="text-xs text-slate-500">{user.username}</span></td><td class="p-4"><a class="text-cyan-300 underline" href={`/super-admin/utilities/${user.tenantId}`}>#{user.tenantId}</a></td><td class="p-4">{user.roleName}</td><td class="p-4">{user.email}</td><td class="p-4">{user.emailVerified ? 'Yes' : 'No'}</td><td class="p-4">{user.status}</td><td class="p-4">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td><td class="p-4">{#if canManage && ['Active', 'Disabled'].includes(user.status)}<button class="text-cyan-300 underline" onclick={() => { selected = user; reason = ''; }}>{user.status === 'Active' ? 'Disable' : 'Reactivate'}</button>{:else}<span class="text-slate-500">Unavailable</span>{/if}</td></tr>{/each}</tbody></table></div>{/if}
	<div class="mt-4 flex items-center justify-between text-sm text-slate-400"><span>{result.total} user{result.total === 1 ? '' : 's'} · Page {result.page} of {Math.max(result.totalPages, 1)}</span><div class="flex gap-2"><button class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40" disabled={pageNumber <= 1} onclick={() => movePage(pageNumber - 1)}>Previous</button><button class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40" disabled={pageNumber >= result.totalPages} onclick={() => movePage(pageNumber + 1)}>Next</button></div></div>
{/if}
{#if selected}
	<div class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="presentation">
		<div role="dialog" aria-modal="true" aria-labelledby="status-title" class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
			<h2 id="status-title" class="text-lg font-bold">{selected.status === 'Active' ? 'Disable' : 'Reactivate'} {selected.fullName}</h2>
			<p class="mt-2 text-sm text-slate-400">Utility #{selected.tenantId}. Disabling revokes existing sessions; the last active utility administrator cannot be disabled.</p>
			<label class="mt-4 block text-sm">Reason<textarea class="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 p-2" bind:value={reason} maxlength="500"></textarea></label>
			<div class="mt-4 flex gap-2"><button class="rounded-lg bg-amber-600 px-4 py-2 font-semibold disabled:opacity-50" disabled={busy || !reason.trim()} onclick={changeStatus}>Confirm</button><button class="rounded-lg border border-slate-700 px-4 py-2" onclick={() => selected = null}>Cancel</button></div>
		</div>
	</div>
{/if}
