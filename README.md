# The Solomons Cook

Shared household cookbook, rolling 7-day meal plan, and shopping list. Mobile-first PWA.

## Stack

- React + TypeScript + Vite
- Hash router (GitHub Pages friendly)
- Supabase (Auth, Postgres, Storage) with localStorage fallback when env keys are missing
- Custom service worker (`public/sw.js`) + web manifest for install / offline assets

## Setup

1. Create a Supabase project.
2. Run [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) in the SQL editor.
3. Enable Email magic-link auth in Supabase Auth settings. Add your GitHub Pages URL to redirect allow list.
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
