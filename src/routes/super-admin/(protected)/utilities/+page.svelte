<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import StatePanel from '$lib/components/StatePanel.svelte';
	import { platformService } from '$lib/platform/service';
	import type { PlatformPage, PlatformUtility } from '$lib/platform/types';

	let result = $state<PlatformPage<PlatformUtility> | null>(null);
	let search = $state('');
	let status = $state('');
	let module = $state('');
	let sort = $state('name');
	const canCreate = $derived(
		['super-admin', 'operations-admin'].includes(page.data.platformSession?.role)
	);
	let pageNumber = $state(1);
	let loading = $state(true);
	let errorMessage = $state('');
	async function load() {
		loading = true;
		errorMessage = '';
		try {
			result = await platformService.utilities({
				search: search.trim(),
				status,
				module,
				sort,
				page: pageNumber,
				pageSize: 20
			});
		} catch (e) {
			errorMessage = e instanceof Error ? e.message : 'Unable to load utilities.';
		} finally {
			loading = false;
		}
	}
	function submit(event: SubmitEvent) {
		event.preventDefault();
		pageNumber = 1;
		load();
	}
	onMount(load);
</script>

<svelte:head><title>Utilities | WAS Platform</title></svelte:head>
<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="text-xs font-bold tracking-[0.2em] text-cyan-400">TENANT MANAGEMENT</p>
		<h1 class="mt-2 text-3xl font-bold">Utilities</h1>
		<p class="mt-2 text-slate-400">Search, review, and control utility organizations.</p>
	</div>
	{#if canCreate}<a
			href="/super-admin/utilities/new"
			class="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold hover:bg-cyan-500"
			>Onboard utility</a
		>{/if}
</header>
<form
	onsubmit={submit}
	class="mb-6 grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_180px_180px_180px_auto]"
>
	<input
		aria-label="Search utilities"
		class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
		placeholder="Search name, slug, or contact"
		bind:value={search}
	/><select
		aria-label="Filter by status"
		class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
		bind:value={status}
		><option value="">All statuses</option><option>Active</option><option>Onboarding</option><option
			>Suspended</option
		><option>Migration Review</option></select
	><select
		aria-label="Filter by module"
		class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
		bind:value={module}
		><option value="">All modules</option><option>customers</option><option>meters</option><option
			>readings</option
		><option>billing</option><option>payments</option><option>support</option><option
			>reports</option
		><option>advisories</option></select
	><select
		aria-label="Sort utilities"
		class="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3"
		bind:value={sort}
		><option value="name">Name</option><option value="newest">Newest</option><option value="oldest"
			>Oldest</option
		><option value="status">Status</option></select
	><button class="rounded-xl border border-cyan-700 px-5 font-semibold text-cyan-300">Apply</button>
</form>
{#if loading}<StatePanel
		variant="loading"
		title="Loading utilities"
	/>{:else if errorMessage}<StatePanel
		variant="warning"
		title="Utilities unavailable"
		message={errorMessage}
	/>{:else if !result?.items.length}<StatePanel
		title="No utilities found"
		message="Adjust the filters or onboard the first utility."
		actionLabel={canCreate ? 'Onboard utility' : ''}
		actionHref={canCreate ? '/super-admin/utilities/new' : ''}
	/>{:else if result}
	<div class="overflow-x-auto rounded-2xl border border-slate-800">
		<table class="w-full min-w-[850px] text-left text-sm">
			<thead class="bg-slate-900 text-xs tracking-wide text-slate-400 uppercase"
				><tr
					><th class="p-4">Utility</th><th class="p-4">Type</th><th class="p-4">Contact</th><th
						class="p-4">Status</th
					><th class="p-4">Created</th><th class="p-4"></th></tr
				></thead
			><tbody
				>{#each result.items as utility}<tr class="border-t border-slate-800 bg-slate-900/40"
						><td class="p-4"
							><strong class="block text-white">{utility.displayName}</strong><span
								class="text-xs text-slate-500">{utility.slug}</span
							></td
						><td class="p-4 text-slate-300">{utility.utilityType}</td><td class="p-4"
							><span class="block">{utility.primaryContactName}</span><span
								class="text-xs text-slate-500">{utility.primaryContactEmail}</span
							></td
						><td class="p-4"
							><span class="rounded-full bg-slate-800 px-3 py-1 text-xs">{utility.status}</span></td
						><td class="p-4 text-slate-400">{new Date(utility.createdAt).toLocaleDateString()}</td
						><td class="p-4 text-right"
							><a href={`/super-admin/utilities/${utility.id}`} class="font-semibold text-cyan-400"
								>Open</a
							></td
						></tr
					>{/each}</tbody
			>
		</table>
	</div>
	<div class="mt-4 flex items-center justify-between text-sm text-slate-400">
		<span>{result.total} utilities · Page {result.page} of {result.totalPages}</span>
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
	</div>
{/if}
