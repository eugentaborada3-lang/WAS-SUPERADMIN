<script lang="ts">
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformRoleTemplate } from '$lib/platform/types';
	let roles = $state<PlatformRoleTemplate[]>([]);
	let loading = $state(true);
	let errorMessage = $state('');
	onMount(async () => {
		try {
			roles = await platformService.roles();
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to load role templates.';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head><title>Roles and permissions | WAS Platform</title></svelte:head>
<header class="mb-7">
	<p class="text-xs font-bold tracking-[0.2em] text-cyan-400">ACCESS GOVERNANCE</p>
	<h1 class="mt-2 text-3xl font-bold">Roles and permissions</h1>
	<p class="mt-2 text-slate-400">
		Documented platform role templates enforced by the backend. Templates are read-only in this
		release.
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
			</article>{/each}
	</div>{/if}
