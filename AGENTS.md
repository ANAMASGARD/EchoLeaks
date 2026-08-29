<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# EchoLeaks agent rules

## Memory (`memory/memory.md`)

**Before every commit**, update `memory/memory.md` with what changed in this session.

- Keep it **short, precise, and simple** — future sessions append here; avoid bloat so context stays usable.
- Only record: stack facts, what's built, key file paths, what's not built yet, and non-obvious layout/config notes.
- Do **not** paste long prose, full component lists, or duplicate `AGENTS.md` rules.

## Design — Neobrutalism

Always follow **Neobrutalism** (neobrutalism.com / `@neobrutalism` registry):

- Thick black borders, hard offset shadows (no blur), high-contrast palette (cream bg, yellow primary, black borders)
- Use existing theme tokens in `app/globals.css` and components from `components/ui/`
- Add UI via: `npx shadcn@latest add @neobrutalism/<name>`

**Rounded corners:** All buttons, inputs, cards, and interactive controls use **rounded corners** (prefer `rounded-full` for buttons, `rounded-lg` / `rounded-xl` for panels). Do not use sharp square corners on UI chrome even though base `--radius` may be `0`.

## Landing UX (current)

- Video-first, minimal, single viewport — no hero clutter
- Prefer Neobrutalist CTAs with rounded-full + border-2 + shadow-md hover lift
