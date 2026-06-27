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
