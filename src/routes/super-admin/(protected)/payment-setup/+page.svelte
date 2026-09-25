<script lang="ts">
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformUtility } from '$lib/platform/types';
	let utilities = $state<PlatformUtility[]>([]);
	let loading = $state(true);
	let error = $state('');
	onMount(async () => {
		try { const result = await platformService.utilities({pageSize:100}); utilities = result.items; }
		catch (e) { error = e instanceof Error ? e.message : 'Unable to load utilities.'; }
		finally { loading = false; }
	});
</script>
<svelte:head><title>Payment setup | WAS Platform</title></svelte:head>
<header class="mb-7"><p class="text-xs font-bold tracking-[0.2em] text-cyan-400">SA-06</p><h1 class="mt-2 text-3xl font-bold">Payment channel and fee setup</h1><p class="mt-2 text-slate-400">Choose a utility to configure its GCash setup. Local tests never charge customers or post bill payments.</p></header>
{#if loading}<StatePanel variant="loading" title="Loading utilities" />
{:else if error}<StatePanel variant="warning" title="Utilities unavailable" message={error} />
{:else if !utilities.length}<StatePanel title="No utilities found" message="Onboard a utility before configuring payment." />
{:else}<div class="overflow-x-auto rounded-2xl border border-slate-800"><table class="w-full min-w-[650px] text-left text-sm"><thead class="bg-slate-900 text-xs uppercase text-slate-400"><tr><th class="p-4">Utility</th><th class="p-4">Status</th><th class="p-4">Payment setup</th></tr></thead><tbody>{#each utilities as utility}<tr class="border-t border-slate-800"><td class="p-4"><strong>{utility.displayName}</strong><span class="block text-xs text-slate-500">{utility.slug}</span></td><td class="p-4">{utility.status}</td><td class="p-4"><a class="text-cyan-300 underline" href={`/super-admin/payment-setup/${utility.id}`}>Open setup</a></td></tr>{/each}</tbody></table></div>{/if}
