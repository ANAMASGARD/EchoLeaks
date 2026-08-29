# EchoLeaks Memory

> Keep this file **short**. Append only what changed. See `AGENTS.md` for update rules.

**Updated:** 2026-08-29

## Stack
Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn + Neobrutalism (`@neobrutalism` registry) · Clerk (`@clerk/nextjs`, `@clerk/ui` shadcn theme)

## Done
- **UI:** Neobrutalism theme in `app/globals.css` (cream/yellow, thick borders, hard shadows). 54 shadcn/ui components in `components/ui/`. Fonts: Archivo Black (head), Space Grotesk (body).
- **Landing (`/`):** Full-viewport hero — video bg (`public/video/EchoLeaks-Hero-Section-Video.mp4`), tap-to-unmute, hollow **EchoLeaks** title, tagline + **Protect a File** CTA. **Public — no auth required.**
- **Navbar:** Logo left; right = Sign In + Get Started (signed out) or Clerk `UserButton` (signed in).
- **Auth (Clerk):** App **EchoLeaks** (`app_3IZiLv1U2DObIiJ3eMCR6GQxiOc`). Keys in `.env.local` (gitignored). `proxy.ts` = public-first; only `/dashboard(.*)` protected. On landing, Sign In / Get Started open **Clerk modal** over hero (blur backdrop; click backdrop or × to close). `/sign-in`, `/sign-up` = full-page fallback routes.
- **Dashboard (`/dashboard`):** Protected. **Coming soon** placeholder.
- **Hero CTA:** Protect a File → `/dashboard` (redirects to sign-in if logged out).
- **Assets:** Favicon/logo `public/io.github.lo2dev.Echo.svg`

## Key files
`app/page.tsx` · `components/landing/hero-section.tsx` · `components/landing/navbar.tsx` · `components/landing/auth-controls.tsx` · `app/layout.tsx` · `proxy.ts` · `app/dashboard/page.tsx` · `app/sign-in/` · `app/sign-up/` · `.env.local`

## Not built
File upload/protect flow, leak attribution backend, product pages beyond dashboard stub
