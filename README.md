# NalaGrow

Track your baby's growth journey from day one. NalaGrow helps parents log feedings, sleep, growth milestones, and more — with beautiful charts and smart insights.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, React Query
- **Design**: Stitch Design System with Material Design 3-inspired Nurturing Teal palette
- **Backend**: FastAPI, PostgreSQL, Supabase Auth
- **Infrastructure**: Docker, GitHub Actions

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Vault-backed configuration

When `VAULT_ADDR` is configured, the backend loads application configuration
from the Vault KV v2 path `secret/nala-labs/nala-grow`. The Next.js build reads
only the `NEXT_PUBLIC_*` values from that path and never exposes Vault
credentials or backend secrets to the browser. Provide `VAULT_TOKEN` or the
`VAULT_ROLE_ID`/`VAULT_SECRET_ID` AppRole pair at runtime; set
`VAULT_KV_MOUNT` and `VAULT_KV_PATH` only when using non-default values.

For local startup, copy `.vault-config.example` to the repository-root
`.vault-config` and fill it from a protected secret source. The runtime walks
up from the backend or frontend working directory to discover this file;
process environment values override values from the file. The real
`.vault-config` is ignored by Git and must never be committed.

Without Vault transport variables, local development retains the existing
process-environment defaults.

## Project Structure

```
nala-grow/
├── frontend/              # Next.js 14 application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # Reusable UI components
│   │   └── lib/          # Utilities, API client, stores
│   ├── public/           # Static assets, PWA manifest, service worker
│   ├── tailwind.config.ts
│   └── package.json
├── backend/              # FastAPI application (coming soon)
└── docker/               # Docker Compose (coming soon)
```

## Features

- **Feeding Log**: Track breast, bottle, and solids feedings with timers
- **Sleep Tracking**: Log sleep sessions with timers and timeline visualization
- **Growth Charts**: Track weight, height, and head circumference with percentile charts
- **Milestones**: Document and celebrate developmental milestones
- **Multiple Babies**: Switch between profiles
- **Reports & Export**: PDF growth reports (coming soon)

## License

Private — all rights reserved.
