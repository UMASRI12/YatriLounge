# YatriLounge ✈️

Premium, production-ready **React dashboard** for **YatriLounge** — an AI-powered airport lounge crowding predictor.

## Tech stack

- **React + Vite** (TypeScript)
- **Tailwind CSS** (v3.x)
- **Recharts** (charts)
- **Framer Motion** (animations)
- **Lucide React** (icons)
- **Inter** font (Google Fonts)

## Quick start

```bash
npm install
npm run dev
```

Vite will print a local URL (for example `http://127.0.0.1:5173`).

## Backend (InsForge) integration

The UI is built to work in two modes:

- **Live mode** (recommended): loads airports, status, forecast, and flights from InsForge via `@insforge/sdk`.
- **Demo mode**: uses local seed data if InsForge isn’t configured or returns an error.

### Configure environment variables

Create a local env file (do **not** commit it):

`\.env.local`

```bash
VITE_INSFORGE_BASE_URL=https://your-app.region.insforge.app
VITE_INSFORGE_ANON_KEY=your-anon-key
```

- **`VITE_INSFORGE_BASE_URL`**: required
- **`VITE_INSFORGE_ANON_KEY`**: optional (recommended for public reads)

An example file is provided at `.env.example`.

## Authentication

- **Google OAuth**: supported via InsForge Auth (`signInWithOAuth({ provider: 'google' })`).
- **Email/password**: supported (with optional 6-digit email verification code depending on backend settings).
- **Phone login**: InsForge TypeScript Auth SDK does **not** currently expose native SMS/phone OTP methods. To support phone OTP, integrate an SMS provider (e.g. Twilio Verify) via an InsForge Function and map verified numbers to user identities.

### Data model (tables)

The dashboard expects these tables:

- `airports` — `(code, city, flights_monitored)`
- `lounge_status` — `(airport_code, occupancy_percent, people, flights_next_3_hours, updated_at)`
- `occupancy_forecast` — `(airport_code, time_label, value, sort_order)`
- `flight_schedule` — `(airport_code, time_label, airline, aircraft, business, premium, economy, sort_order)`

## Project structure

- `src/App.tsx`: dashboard UI
- `src/lib/insforgeClient.ts`: InsForge client (Vite env-driven)
- `src/services/dashboardData.ts`: backend fetch layer
- `src/data/demo.ts`: demo fallback data

## Scripts

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run preview`: preview production build locally

