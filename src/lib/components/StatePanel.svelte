<script lang="ts">
	type StateVariant = 'loading' | 'empty' | 'warning';

	let {
		title = 'No records available',
		message = 'There is nothing to display right now.',
		variant = 'empty',
		actionLabel = '',
		actionHref = ''
	} = $props<{
		title?: string;
		message?: string;
		variant?: StateVariant;
		actionLabel?: string;
		actionHref?: string;
	}>();
</script>

<div class="rounded-xl border border-slate-800 bg-slate-900/60 p-8">
	<div class="flex flex-col items-center justify-center text-center">
		{#if variant === 'loading'}
			<div class="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400"></div>
		{:else if variant === 'warning'}
			<div class="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-lg text-amber-400">!</div>
		{:else}
			<div class="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-lg text-slate-300">•</div>
		{/if}

		<h3 class="text-base font-semibold text-white">{title}</h3>
		<p class="mt-2 max-w-md text-sm text-slate-400">{message}</p>

		{#if actionHref && actionLabel}
			<a
				href={actionHref}
				class="mt-4 inline-flex items-center rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-500"
			>
				{actionLabel}
			</a>
		{/if}
	</div>
</div>
