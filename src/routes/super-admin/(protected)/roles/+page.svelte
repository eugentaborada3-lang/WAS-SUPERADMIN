<script lang="ts">
	import { onMount } from 'svelte';
	import './page.css';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformRoleTemplate } from '$lib/platform/types';
	let roles = $state<PlatformRoleTemplate[]>([]);
	let loading = $state(true);
	let errorMessage = $state('');
	let notice = $state('');
	let permissions = $state<{ id:number; name:string; description:string }[]>([]);
	let editing = $state<PlatformRoleTemplate | null>(null);
	let selectedPermissions = $state<string[]>([]);
	let displayName = $state('');
	let description = $state('');
	let reason = $state('');
	let saving = $state(false);
	async function load() {
		[roles, permissions] = await Promise.all([platformService.roles(), platformService.permissions()]);
	}
	onMount(async () => {
		try {
			await load();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to load role templates.';
		} finally {
			loading = false;
		}
	});
	function startEdit(role: PlatformRoleTemplate) { editing = role; selectedPermissions = [...role.permissions]; displayName = role.displayName; description = role.description; reason = ''; errorMessage = ''; notice = ''; }
	async function saveRole(event: SubmitEvent) { event.preventDefault(); if (!editing) return; saving = true; errorMessage = ''; try { await platformService.updateRole(editing.id,{ displayName,description,permissions:selectedPermissions,reason }); notice = 'Role template updated. New authorization checks use the persisted matrix.'; editing = null; await load(); } catch(e) { errorMessage = e instanceof Error ? e.message : 'Unable to update role template.'; } finally { saving = false; } }
</script>

<svelte:head><title>Roles and permissions | WAS Platform</title></svelte:head>
<div class="platform-roles-page">
<header class="mb-7">
	<p class="text-xs font-bold tracking-[0.2em] text-cyan-400">ACCESS GOVERNANCE</p>
	<h1 class="mt-2 text-3xl font-bold">Roles and permissions</h1>
	<p class="mt-2 text-slate-400">
		Persisted platform role templates enforced by the backend authorization layer.
	</p>
</header>
{#if loading}<StatePanel
		variant="loading"
		title="Loading role matrix"
	/>{:else if errorMessage}<StatePanel
		variant="warning"
		title="Role matrix unavailable"
		message={errorMessage}
	/>{:else}<div class="grid gap-5 xl:grid-cols-2">
		{#if notice}<p role="status" class="xl:col-span-2 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-200">{notice}</p>{/if}
		{#each roles as role}<article class="rounded-2xl border border-slate-800 bg-slate-900 p-6">
				<h2 class="text-lg font-bold">{role.displayName}</h2>
				<p class="mt-2 text-sm text-slate-400">{role.description}</p>
				<ul class="mt-5 grid gap-2 sm:grid-cols-2">
					{#each role.permissions as permission}<li
							class="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 font-mono text-xs text-cyan-200"
						>
							{permission}
						</li>{/each}
				</ul>
				{#if role.name !== 'super-admin'}<button type="button" onclick={() => startEdit(role)} class="mt-5 rounded-lg border border-cyan-700 px-3 py-2 text-sm font-semibold text-cyan-300">Edit template</button>{:else}<p class="mt-5 text-xs text-amber-200">The Super Admin template is protected to prevent platform lockout.</p>{/if}
			</article>{/each}
	</div>{/if}

{#if editing}<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onsubmit={saveRole} class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6"><h2 class="text-xl font-bold">Edit {editing.displayName}</h2><div class="mt-5 grid gap-4 sm:grid-cols-2"><label class="text-sm">Display name<input class="field" bind:value={displayName} required /></label><label class="text-sm">Description<input class="field" bind:value={description} /></label><fieldset class="sm:col-span-2"><legend class="text-sm font-semibold">Permissions</legend><div class="mt-3 grid gap-2 sm:grid-cols-2">{#each permissions as permission}<label class="rounded-lg border border-slate-700 p-3 text-xs"><input type="checkbox" bind:group={selectedPermissions} value={permission.name} class="mr-2" />{permission.name}<span class="mt-1 block text-slate-500">{permission.description || 'Platform permission'}</span></label>{/each}</div></fieldset><label class="sm:col-span-2 text-sm">Reason for change<textarea class="field min-h-20" bind:value={reason} minlength="5" required></textarea></label></div><div class="mt-5 flex justify-end gap-2"><button type="button" class="rounded-lg border border-slate-700 px-4 py-2" onclick={() => editing = null}>Cancel</button><button disabled={saving || selectedPermissions.length === 0 || reason.trim().length < 5} class="rounded-lg bg-cyan-600 px-4 py-2 font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Save template'}</button></div></form></div>{/if}

</div>
