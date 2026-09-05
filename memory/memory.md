# EchoLeaks Memory

> Keep this file **short**. Append only what changed. See `AGENTS.md` for update rules.

**Updated:** 2026-09-04

## Stack
Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn + Neobrutalism · Clerk · Neon/Drizzle · private Cloudflare R2 · Brevo · Web Crypto/libsodium/IndexedDB/Workers

## Done
- **UI:** Neobrutalism theme in `app/globals.css` (cream/yellow, thick borders, hard shadows, `0.75rem` root radius). Buttons and navigation controls stay rounded; sidebar toggles use a yellow, hard-shadowed hamburger control. 54 shadcn/ui components in `components/ui/`. Fonts: Archivo Black (head), Space Grotesk (body).
- **Landing (`/`):** Full-viewport hero — video bg (`public/video/EchoLeaks-Hero-Section-Video.mp4`), tap-to-unmute, hollow **EchoLeaks** title, tagline + **Protect a File** CTA. **Public — no auth required.**
- **Navbar:** Logo left; right = Sign In + Get Started (signed out) or Clerk `UserButton` (signed in).
- **Auth (Clerk):** App **EchoLeaks** (`app_3IZiLv1U2DObIiJ3eMCR6GQxiOc`). Keys in `.env.local` (gitignored). `proxy.ts` = public-first; only `/dashboard(.*)` protected. On landing, Sign In / Get Started open **Clerk modal** over hero (blur backdrop; click backdrop or × to close). `/sign-in`, `/sign-up` = full-page fallback routes.
- **Dashboard:** Protected shared Neobrutalist shell with collapsible sidebar, masked email, Clerk profile, and rounded controls. Dashboard, Scan, and History remain **Coming soon** placeholders.
- **Protected sharing:** `/dashboard/upload` encrypts files up to 25 MiB with AES-256-GCM in a Worker, uploads ciphertext directly to private R2, stores encrypted metadata and RSA-OAEP key envelopes in Neon, and creates recipient-bound links. Key recovery uses Argon2id, encrypted backup in Neon, and a non-extractable private key in IndexedDB.
- **Recipients:** Manual or local CSV/TXT/XLSX import (100 max), live Clerk verified-email lookup, separate browser-wrapped key per enrolled recipient, copy links, optional expiry/permissions, and Brevo personalized batch email. `/share/[shareId]` checks Clerk user ID + verified email before issuing a five-minute R2 URL and decrypts locally.
- **Backend:** Drizzle schema/migration, authenticated Route Handlers, private R2 presigning/HEAD verification, Brevo idempotency, revocation/events, no-store responses, and focused crypto/policy/email tests.
- **Database config:** `drizzle.config.ts` loads `.env.local` via `@next/env`; use `db:generate`, `db:check`, `db:migrate`, `db:verify`, and `db:studio`. `DATABASE_URL` stays server-only.
- **Hero CTA:** Protect a File → `/dashboard` (redirects to sign-in if logged out).
- **Assets:** Favicon/logo `public/io.github.lo2dev.Echo.svg`

## Key files
`components/dashboard/upload-workspace.tsx` · `components/dashboard/share-panel.tsx` · `app/api/` · `app/share/` · `lib/crypto/` · `workers/` · `lib/db/schema.ts` · `drizzle/` · `.env.example`

## Not built / not verified live
Neon connectivity and all six Drizzle tables were verified live after applying `drizzle/0000_thin_cannonball.sql`. Real R2/Brevo provisioning and credential-backed end-to-end delivery remain unverified. No large-file streaming, delivery webhooks/queue, automatic post-enrollment share finalization, leak scanning/fingerprinting, or full history UI.
