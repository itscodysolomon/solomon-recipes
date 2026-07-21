# The Solomons Cook

Shared household cookbook, rolling 7-day meal plan, and shopping list. Mobile-first PWA.

## Stack

- React + TypeScript + Vite
- Hash router (GitHub Pages friendly)
- Supabase (Auth, Postgres, Storage) with localStorage fallback when env keys are missing
- Custom service worker (`public/sw.js`) + web manifest for install / offline assets

## Setup

1. Create a Supabase project.
2. Run the SQL migrations in the SQL editor, in order:
   - [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
   - [`supabase/migrations/002_plan_entry_notes.sql`](supabase/migrations/002_plan_entry_notes.sql)
3. In Supabase Auth, create the two household users with email/password, then disable new user signups.
4. Copy env and fill keys:

```bash
cp .env.example .env
```

5. Install and run:

```bash
npm install
npm run dev
```

Without Supabase keys, open the app and choose **Continue locally** — data stays in the browser.

## Deploy (GitHub Pages)

1. Repo Settings → Pages → Source: **GitHub Actions**.
2. Add repository secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Push to `main` — workflow builds and deploys `dist`.

## Design

Visual direction and phone mockups live in [`design/`](design/).
