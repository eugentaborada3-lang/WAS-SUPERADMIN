<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import './page.css';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformPage, PlatformRole, PlatformUser } from '$lib/platform/types';
	let result = $state<PlatformPage<PlatformUser> | null>(null);
	let loading = $state(true);
	let busy = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');
	let search = $state('');
	let status = $state('');
	let roleFilter = $state('');
	let pageNumber = $state(1);
	let fullName = $state('');
	let email = $state('');
	let role = $state<PlatformRole>('support-agent');
	let developmentLink = $state('');
	let actionReason = $state('');
	let adminCode = $state('');
	let editingUserId = $state<number | null>(null);
	let editName = $state('');
	let editRole = $state<PlatformRole>('support-agent');
	const canManage = $derived(page.data.platformSession?.role === 'super-admin');
	async function load() {
		loading = true;
		errorMessage = '';
		try {
			result = await platformService.users({
				search,
				status,
				role: roleFilter,
				page: pageNumber,
				pageSize: 20
			});
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to load platform users.';
		} finally {
			loading = false;
		}
	}
	async function create() {
		busy = true;
		errorMessage = '';
		successMessage = '';
		try {
			const invitation = await platformService.createUser({ fullName, email, role });
			fullName = '';
			email = '';
			developmentLink = invitation.developmentLink ?? '';
			successMessage = invitation.delivery === 'email' ? 'Invitation sent by email.' : 'Invitation link created for local development. Share it securely.';
			await load();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to create platform user.';
		} finally {
			busy = false;
		}
	}
	async function issueResetLink(user: PlatformUser) {
		if (!actionReason.trim() || !adminCode.trim()) { errorMessage = 'Enter a reason and your MFA code.'; return; }
		busy = true;
		try {
			const result = await platformService.adminResetLink(user.id, actionReason, adminCode.trim());
			developmentLink = result.developmentLink ?? '';
			successMessage = result.delivery === 'email' ? 'Password reset email sent.' : 'Local development reset link created.';
			actionReason = '';
			adminCode = '';
		} catch (e) { errorMessage = e instanceof Error ? e.message : 'Unable to issue reset link.'; }
		finally { busy = false; }
	}
	async function toggleStatus(user: PlatformUser) {
		if (!actionReason.trim()) {
			errorMessage = 'Enter a reason before changing access.';
			return;
		}
		busy = true;
		try {
			await platformService.changeUserStatus(
				user.id,
				user.status === 'Active' ? 'Disabled' : 'Active',
				actionReason
			);
			actionReason = '';
			successMessage = 'Access status changed and audited.';
			await load();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to change user status.';
		} finally {
			busy = false;
		}
	}
	async function resetMFA(user: PlatformUser) {
		if (!actionReason.trim() || !adminCode.trim()) {
			errorMessage = 'Enter a reason and your MFA code before resetting MFA.';
			return;
		}
		busy = true;
		try {
			await platformService.resetUserMFA(user.id, actionReason, adminCode.trim());
			actionReason = '';
			adminCode = '';
			successMessage = 'MFA enrollment reset and sessions revoked.';
			await load();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to reset MFA.';
		} finally {
			busy = false;
		}
	}
	function edit(user: PlatformUser) {
		editingUserId = user.id;
		editName = user.fullName;
		editRole = user.roleName;
	}
	async function saveEdit() {
		if (editingUserId === null) return;
		busy = true;
		errorMessage = '';
		try {
			await platformService.updateUser(editingUserId, { fullName: editName, role: editRole });
			editingUserId = null;
			successMessage = 'Platform user updated and audited.';
			await load();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to update platform user.';
		} finally {
			busy = false;
		}
	}
	onMount(load);
</script>

<svelte:head><title>Platform users | WAS Platform</title></svelte:head>
<div class="platform-users-page">
<header class="mb-7">
	<p class="text-xs font-bold tracking-[0.2em] text-cyan-400">PLATFORM ACCESS</p>
	<h1 class="mt-2 text-3xl font-bold">Platform users</h1>
	<p class="mt-2 text-slate-400">Accounts here are separate from every utility tenant.</p>
</header>
{#if errorMessage}<div
		role="alert"
		class="mb-5 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-200"
	>
		{errorMessage}
	</div>{/if}{#if successMessage}<div
		role="status"
		class="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200"
	>
		{successMessage}
	</div>{/if}
{#if developmentLink}<div class="mb-5 rounded-xl border border-amber-700 bg-amber-950/30 p-4 text-sm text-amber-100">Development-only one-time link (shown once): <a class="break-all underline" href={developmentLink}>{developmentLink}</a></div>{/if}
{#if canManage}<section class="mb-7 rounded-2xl border border-slate-800 bg-slate-900 p-6">
		<h2 class="font-bold">Invite platform user</h2>
		<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<label class="text-sm">Full name<input class="field" bind:value={fullName} /></label><label
				class="text-sm">Email<input class="field" type="email" bind:value={email} /></label
			><label class="text-sm"
				>Role<select class="field" bind:value={role}
					><option value="operations-admin">Operations admin</option><option value="finance-admin"
						>Finance admin</option
					><option value="support-agent">Support agent</option><option value="super-admin"
						>Super admin</option
				></select
				></label
			>
		</div>
		<button
			class="mt-4 rounded-xl bg-cyan-600 px-5 py-2.5 font-bold disabled:opacity-50"
			onclick={create}
			disabled={busy || !fullName || !email}>Send invitation</button
		>
	</section>{/if}
<form
	class="mb-5 grid gap-3 md:grid-cols-[1fr_180px_190px_auto]"
	onsubmit={(event) => {
		event.preventDefault();
		pageNumber = 1;
		load();
	}}
>
	<input
		class="field mt-0 max-w-lg"
		aria-label="Search platform users"
		placeholder="Search name or email"
		bind:value={search}
	/><select aria-label="Filter platform user status" class="field mt-0" bind:value={status}
		><option value="">All statuses</option><option>Invited</option><option>Active</option><option>Disabled</option></select
	><select aria-label="Filter platform user role" class="field mt-0" bind:value={roleFilter}
		><option value="">All roles</option><option value="super-admin">Super Admin</option><option
			value="operations-admin">Operations Admin</option
		><option value="finance-admin">Finance Admin</option><option value="support-agent"
			>Support Agent</option
		></select
	><button class="rounded-xl border border-slate-700 px-4">Search</button>
</form>
{#if canManage}<label class="mb-5 block max-w-xl text-sm font-semibold"
		>Reason for the next access or MFA action<input
			class="field"
			bind:value={actionReason}
			placeholder="Required and recorded in the audit log"
		/></label
	><label class="mb-5 block max-w-xl text-sm font-semibold">Your MFA code for password or MFA reset<input class="field" bind:value={adminCode} autocomplete="one-time-code" placeholder="Authenticator or unused recovery code" /></label>{/if}
{#if canManage && editingUserId !== null}<section
		class="mb-5 rounded-2xl border border-cyan-800 bg-cyan-950/20 p-5"
	>
		<h2 class="font-bold">Edit platform user</h2>
		<div class="mt-3 grid gap-3 sm:grid-cols-2">
			<label class="text-sm">Name<input class="field" bind:value={editName} /></label><label
				class="text-sm"
				>Role<select class="field" bind:value={editRole}
					><option value="super-admin">Super Admin</option><option value="operations-admin"
						>Operations Admin</option
					><option value="finance-admin">Finance Admin</option><option value="support-agent"
						>Support Agent</option
					></select
				></label
			>
		</div>
		<div class="mt-4 flex gap-2">
			<button
				class="rounded-lg bg-cyan-600 px-4 py-2 font-semibold"
				onclick={saveEdit}
				disabled={busy || !editName.trim()}>Save changes</button
			><button
				class="rounded-lg border border-slate-700 px-4 py-2"
				onclick={() => (editingUserId = null)}>Cancel</button
			>
		</div>
	</section>{/if}
{#if loading}<StatePanel
		variant="loading"
		title="Loading platform users"
	/>{:else if !result?.items.length}<StatePanel
		title="No platform users found"
	/>{:else if result}<div class="overflow-x-auto rounded-2xl border border-slate-800">
		<table class="w-full min-w-[900px] text-left text-sm">
			<thead class="bg-slate-900 text-xs text-slate-400 uppercase"
				><tr
					><th class="p-4">User</th><th class="p-4">Role</th><th class="p-4">MFA</th><th class="p-4"
						>Last login</th
					><th class="p-4">Status</th>{#if canManage}<th class="p-4">Actions</th>{/if}</tr
				></thead
			><tbody
				>{#each result.items as user}<tr class="border-t border-slate-800 bg-slate-900/40"
						><td class="p-4"
							><strong class="block">{user.fullName}</strong><span class="text-xs text-slate-500"
								>{user.email}</span
							></td
						><td class="p-4 capitalize">{user.roleName.replaceAll('-', ' ')}</td><td class="p-4"
							>{user.mfaEnabled ? 'Enabled' : 'Not enrolled'}</td
						><td class="p-4 text-slate-400"
							>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td
						><td class="p-4">{user.status}</td>{#if canManage}<td class="p-4"
								><div class="flex gap-2">
									<button
										class="rounded-lg border border-slate-700 px-3 py-2 text-xs"
										onclick={() => edit(user)}
										disabled={busy}>Edit</button
									>
									<button
										class="rounded-lg border border-slate-700 px-3 py-2 text-xs"
										onclick={() => toggleStatus(user)}
										disabled={busy}>{user.status === 'Active' ? 'Disable' : 'Enable'}</button
									><button
										class="rounded-lg border border-slate-700 px-3 py-2 text-xs"
										onclick={() => resetMFA(user)}
										disabled={busy || !user.mfaEnabled}>Reset MFA</button
									><button class="rounded-lg border border-slate-700 px-3 py-2 text-xs" onclick={() => issueResetLink(user)} disabled={busy || user.status !== 'Active'}>Reset password</button
									>
								</div></td
							>{/if}</tr
					>{/each}</tbody
			>
		</table>
	</div>
	<div class="mt-4 flex justify-between text-sm text-slate-400">
		<span>{result.total} users · Page {result.page} of {result.totalPages}</span>
		<div class="flex gap-2">
			<button
				class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40"
				disabled={pageNumber <= 1}
				onclick={() => {
					pageNumber--;
					load();
				}}>Previous</button
			><button
				class="rounded-lg border border-slate-700 px-3 py-2 disabled:opacity-40"
				disabled={pageNumber >= result.totalPages}
				onclick={() => {
					pageNumber++;
					load();
				}}>Next</button
			>
		</div>
	</div>{/if}
</div>
