# Accounter

Track shared expenses with friends and groups. Split costs equally, exactly, or by percentage, record settlements, and see who owes whom — all behind Clerk authentication with data stored per-user in MongoDB Atlas.

## Features

- **Groups & members** — create groups, invite members (with email-based identity via Clerk), edit or delete them.
- **Expenses** — split costs equally, by exact amounts, or by percentage; per-member split validation.
- **Settlements** — record paybacks, with simplified "who pays whom" suggestions and a one-click record per debt.
- **Balances** — live Paid / Owed / Net per member; balances auto-refresh (history clears) once everyone is settled up, with a notice for leftover cents caused by rounding.
- **History** — chronological log of all expenses and settlements.
- **PDF export** — downloadable group summary (balances, settlements, expenses, members).
- **Realtime-safe state** — balances recalculate after every mutation.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) + shadcn-style UI components
- [Clerk](https://clerk.com) for authentication
- [MongoDB Atlas](https://www.mongodb.com/atlas) via the native `mongodb` driver
- [Vitest](https://vitest.dev) + Testing Library for unit tests
- [jsPDF](https://github.com/parallax/jsPDF) for PDF export

## Getting started

### Prerequisites

- Node.js 20+
- A [Clerk](https://dashboard.clerk.com) application (publishable + secret keys)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local env file from the template and fill in your keys:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Description |
   | --- | --- |
   | `MONGODB_URI` | MongoDB Atlas connection string (URL-encode the password) |
   | `MONGODB_DB` | Database name (optional, defaults to `accounter`) |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_test_...`) |
   | `CLERK_SECRET_KEY` | Clerk secret key (`sk_test_...`) |
   | `CLERK_FAPI_URL` | Clerk Frontend API domain (needed by the proxy) |

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign in, and create your first group.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run tests once (CI-friendly) |

## Project structure

```
src/
├── app/              # App Router pages + API routes
│   ├── api/          # REST endpoints (groups, expenses, settlements)
│   ├── groups/[id]/  # Group detail page
│   └── sign-in|up/   # Clerk auth pages
├── components/       # Dashboard views, forms, UI primitives
├── hooks/            # Global app state (useApp reducer + context)
├── lib/              # API client, repositories, balance math, validation, PDF export
└── proxy.ts          # Clerk auth proxy (middleware)
```

All data access is scoped by the authenticated Clerk user id, so users only ever see their own groups.

## Deploy

Deployable to any Node host (e.g. [Vercel](https://vercel.com)). Set the environment variables from `.env.example` in your hosting dashboard.
