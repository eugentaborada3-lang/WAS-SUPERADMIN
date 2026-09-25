# Water Assistant System — Super Admin

Standalone SvelteKit frontend for platform administrators. The tenant/utility frontend remains in `WAS_WEBAPP`; both currently use the Go API and MySQL database maintained there. This repository contains no backend, database, or payment-provider credentials.

## Run locally

1. Start the Go API in `../WAS_WEBAPP/backend` using its local `.env` and MySQL setup.
2. In the backend environment, allow both browser origins with `FRONTEND_ORIGINS=http://localhost:5173,http://localhost:5174` and use `PLATFORM_PUBLIC_URL=http://localhost:5174` for local invitation/reset links. Restart the API after changing these values.
3. Copy `.env.example` to `.env` if you need to change the API URL. Never commit `.env`.
4. Run `npm ci`, then `npm run dev`. Open <http://localhost:5174/super-admin/login>.

Run `npx svelte-check --tsconfig ./tsconfig.json` and `npm run build` before publishing.

The SA-06 payment provider is a local simulator only. It does not charge or settle money. Production payment activation remains disabled until approved fee limits, provider integration, credentials, and external approval are available.

## Repository boundary

This local project has its own Git history and no GitHub remote yet. Do not push the tenant repository's backend or secrets into this frontend repository. The original Super Admin routes are temporarily retained in `WAS_WEBAPP` for a safe transition; remove them only after deployment URLs and users have migrated.
