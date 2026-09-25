<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { ApiError } from '$lib/api';
	import { platformService } from '$lib/platform/service';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let code = $state('');
	let enrollmentCodeError = $state('');
	let challengeToken = $state('');
	let challengeExpiresAt = $state('');
	let enrollmentRequired = $state(false);
	let enrollment = $state<{ secret: string; uri: string; expiresAt: string } | null>(null);
	let recoveryCodes = $state<string[]>([]);
	let submitting = $state(false);
	let checkingSession = $state(true);
	let errorMessage = $state('');
	let errorId = $state('');

	onMount(async () => {
		try {
			await platformService.session();
			await goto('/super-admin/dashboard');
		} catch {
			checkingSession = false;
		}
	});

	function showError(error: unknown) {
		errorMessage = error instanceof Error ? error.message : 'Unable to sign in. Try again.';
		errorId = error instanceof ApiError ? (error.errorId ?? '') : '';
	}

	async function submitPassword(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		errorMessage = '';
		errorId = '';
		try {
			const result = await platformService.login(email.trim(), password);
			if ((result.mfaRequired || result.enrollmentRequired) && result.challengeToken) {
				challengeToken = result.challengeToken;
				enrollmentRequired = result.enrollmentRequired;
				challengeExpiresAt = result.challengeExpiresAt ?? '';
				password = '';
				if (result.enrollmentRequired)
					enrollment = await platformService.beginMFAEnrollment(result.challengeToken);
				return;
			}
			await goto('/super-admin/dashboard');
		} catch (error) {
			showError(error);
		} finally {
			submitting = false;
		}
	}

	async function submitEnrollment(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		errorId = '';
		enrollmentCodeError = '';
		const normalizedCode = code.replace(/[^0-9]/g, '');
		if (!/^[0-9]{6}$/.test(normalizedCode)) {
			enrollmentCodeError = 'Enter the six-digit code from your authenticator app.';
			return;
		}
		submitting = true;
		try {
			const result = await platformService.confirmMFAEnrollment(challengeToken, normalizedCode);
			recoveryCodes = result.recoveryCodes;
			code = '';
		} catch (error) {
			showError(error);
		} finally {
			submitting = false;
		}
	}

	async function submitMFA(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		errorMessage = '';
		errorId = '';
		try {
			await platformService.verifyMFA(challengeToken, code.trim());
			await goto('/super-admin/dashboard');
		} catch (error) {
			showError(error);
		} finally {
			submitting = false;
		}
	}

	function startOver() {
		challengeToken = '';
		challengeExpiresAt = '';
		enrollmentRequired = false;
		enrollment = null;
		code = '';
		enrollmentCodeError = '';
		errorMessage = '';
		errorId = '';
	}
</script>

<svelte:head><title>Sign in | Water Assistant System</title></svelte:head>

<main
	class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080f1e] px-4 py-10 text-slate-100 sm:px-6"
>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute top-0 -left-32 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl"
	></div>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute -right-28 bottom-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl"
	></div>
	<section
		class="relative grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-slate-700/70 bg-[#111b2d] shadow-[0_32px_90px_rgba(0,0,0,0.35)] lg:min-h-[620px] lg:grid-cols-[1.05fr_1fr]"
	>
		<div
			class="relative flex min-h-64 flex-col justify-between overflow-hidden border-b border-slate-700/60 bg-gradient-to-br from-[#142b40] via-[#102237] to-[#101b2d] p-8 sm:p-10 lg:border-r lg:border-b-0 lg:p-12"
		>
			<div
				aria-hidden="true"
				class="absolute top-12 -right-28 h-80 w-80 rounded-full border border-cyan-300/10"
			></div>
			<div
				aria-hidden="true"
				class="absolute top-28 -right-12 h-56 w-56 rounded-full border border-cyan-300/10"
			></div>
			<div>
				<div class="flex items-center gap-3">
					<div
						aria-hidden="true"
						class="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-xl font-bold text-cyan-200"
					>
						W
					</div>
					<div>
						<p class="text-sm font-semibold tracking-wide text-white">Water Assistant System</p>
						<p class="text-xs tracking-[0.16em] text-cyan-200/80">PLATFORM ADMINISTRATION</p>
					</div>
				</div>
				<h1
					class="relative mt-12 max-w-md text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl lg:mt-20"
				>
					One place to oversee every utility.
				</h1>
				<p class="relative mt-5 max-w-md text-sm leading-7 text-slate-300">
					Manage utilities, platform users, and operational oversight with confidence.
				</p>
			</div>
			<div
				class="relative mt-10 flex items-start gap-3 border-t border-white/10 pt-5 text-sm text-slate-300"
			>
				<span aria-hidden="true" class="mt-0.5 text-cyan-300">●</span>
				<p>
					Restricted to authorized platform personnel. Your access is protected by multi-factor
					authentication.
				</p>
			</div>
		</div>

		<div class="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
			<p class="text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">Secure sign in</p>
			<h2 class="mt-3 text-3xl font-semibold tracking-tight text-white">
				{recoveryCodes.length
					? 'Save your recovery codes'
					: enrollmentRequired
						? 'Set up your authenticator'
						: challengeToken
							? 'Verify your identity'
							: 'Welcome back'}
			</h2>
			<p class="mt-3 text-sm leading-6 text-slate-400">
				{recoveryCodes.length
					? 'Keep these codes in a secure place. You will need one if you lose access to your authenticator.'
					: enrollmentRequired
						? 'Connect an authenticator app to protect your account.'
						: challengeToken
							? 'Enter the current code from your authenticator app or a recovery code.'
							: 'Sign in with your platform administrator account.'}
			</p>

			{#if errorMessage}
				<div
					role="alert"
					class="mt-6 rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 text-sm text-rose-100"
				>
					{errorMessage}{#if errorId}<span class="mt-1 block text-xs text-rose-300"
							>Reference: {errorId}</span
						>{/if}
				</div>
			{/if}

			{#if checkingSession}
				<div class="mt-8 flex items-center gap-3 text-sm text-slate-400">
					<span
						class="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400"
					></span>Checking your session…
				</div>
			{:else if recoveryCodes.length}
				<p class="mt-6 text-sm text-amber-200">These single-use codes will not be shown again.</p>
				<ul
					class="mt-4 grid gap-2 rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm sm:grid-cols-2"
				>
					{#each recoveryCodes as recoveryCode}<li>{recoveryCode}</li>{/each}
				</ul>
				<button
					class="mt-6 w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
					onclick={() => goto('/super-admin/dashboard')}>I have saved my codes</button
				>
			{:else if enrollmentRequired && enrollment}
				<ol class="mt-7 space-y-3 text-sm leading-6 text-slate-300">
					<li>
						<span class="mr-2 font-semibold text-cyan-300">01</span> Add a time-based account in your
						authenticator app.
					</li>
					<li>
						<span class="mr-2 font-semibold text-cyan-300">02</span> Enter the setup key below into the
						app.
					</li>
					<li>
						<span class="mr-2 font-semibold text-cyan-300">03</span> Enter the six-digit number the app
						generates.
					</li>
				</ol>
				<p class="mt-6 text-xs font-semibold tracking-wider text-slate-400 uppercase">
					Authenticator setup key
				</p>
				<code
					class="mt-2 block rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm break-all text-cyan-200"
					>{enrollment.secret}</code
				>
				<p class="mt-2 text-xs leading-5 text-slate-400">
					Keep this key private. This setup session expires shortly.
				</p>
				<form class="mt-6 space-y-4" novalidate onsubmit={submitEnrollment}>
					<label class="block text-sm font-medium text-slate-200"
						>Six-digit code<input
							class="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-mono text-white transition-colors outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
							bind:value={code}
							oninput={() => (enrollmentCodeError = '')}
							inputmode="numeric"
							autocomplete="one-time-code"
							aria-invalid={enrollmentCodeError !== ''}
							aria-describedby={enrollmentCodeError ? 'enrollment-code-error' : undefined}
							placeholder="000000"
						/></label
					>
					{#if enrollmentCodeError}
						<p id="enrollment-code-error" role="alert" class="text-sm text-rose-300">
							{enrollmentCodeError}
						</p>
					{/if}
					<button
						class="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={submitting}
						>{submitting ? 'Verifying code...' : 'Activate authenticator'}</button
					>
				</form>
				<button
					type="button"
					class="mt-5 text-left text-sm font-medium text-slate-400 hover:text-white"
					onclick={startOver}>Back to sign in</button
				>
			{:else if challengeToken}
				<form class="mt-8 space-y-5" onsubmit={submitMFA}>
					<label class="block text-sm font-medium text-slate-200"
						>Verification code<input
							class="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 font-mono tracking-[0.25em] text-white transition-colors outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
							bind:value={code}
							inputmode="numeric"
							autocomplete="one-time-code"
							required
						/></label
					>
					{#if challengeExpiresAt}<p class="text-xs text-slate-400">
							Challenge expires {new Date(challengeExpiresAt).toLocaleTimeString()}.
						</p>{/if}
					<button
						class="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={submitting}>{submitting ? 'Verifying...' : 'Verify and continue'}</button
					>
					<button
						type="button"
						class="w-full text-sm text-slate-400 hover:text-white"
						onclick={startOver}>Use a different account</button
					>
				</form>
			{:else}
				<form class="mt-8 space-y-5" onsubmit={submitPassword}>
					<label class="block text-sm font-medium text-slate-200"
						>Email<input
							class="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white transition-colors outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
							type="email"
							bind:value={email}
							autocomplete="username"
							placeholder="name@organization.com"
							required
						/></label
					>
					<label class="block text-sm font-medium text-slate-200"
						>Password<input
							class="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-white transition-colors outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							autocomplete="current-password"
							required
						/></label
					>
					<div class="-mt-3 flex justify-end">
						<button
							type="button"
							class="text-sm font-medium text-slate-400 hover:text-white"
							onclick={() => (showPassword = !showPassword)}
							>{showPassword ? 'Hide password' : 'Show password'}</button
						>
					</div>
					<button
						class="w-full rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button
					>
				</form>
				<a
					class="mt-5 block text-center text-sm font-medium text-cyan-300 hover:text-cyan-200"
					href="/super-admin/forgot-password">Forgot your password?</a
				>
			{/if}
			<p class="mt-10 border-t border-slate-800 pt-5 text-center text-xs leading-5 text-slate-500">
				Authorized platform access only.
			</p>
		</div>
	</section>
</main>
