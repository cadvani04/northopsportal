# NorthOps Operations Hub

Client portal + internal ERP for NorthOps. Tasks, deliverables, agreements, invoicing, expenses, timeline, and Fireflies meeting automation.

## Quick start (local)

### 1. Start Postgres

```bash
docker compose up -d
```

Or use a hosted Postgres (Neon, Supabase, Railway) and set `DATABASE_URL` in `.env`.

### 2. Configure environment

Copy `.env.example` to `.env` and set:

```bash
DATABASE_URL="postgresql://northops:northops@localhost:5432/northops"
AUTH_SECRET="$(openssl rand -base64 32)"
```

### 3. Migrate & seed

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | curran@northops.io | northops123 |
| Team | alex@northops.io | northops123 |
| Client (SKAPS) | kush.vyas@skaps.com | northops123 |

## What's built

- **Auth** — login, role-based access (Admin / Team / Client)
- **CRUD** — create, edit, delete tasks, deliverables, clients, agreements, invoices, expenses, timeline
- **Client portal** — each client user sees only their data
- **Notifications** — in-app bell for assignments, invoices, meetings
- **Search** — tasks, clients, invoices
- **Fireflies webhook** — `POST /api/webhooks/fireflies`
- **AI meeting processor** — extracts tasks, deliverables, timeline from transcripts (needs `ANTHROPIC_API_KEY`)
- **Email** — invoice sent + meeting synced (needs `RESEND_API_KEY`)

## Deploy to Railway (recommended)

### You need to do:

1. **Create Railway project** at https://railway.app
2. **Add Postgres** plugin → copy `DATABASE_URL` to env vars
3. **Deploy from GitHub** or `railway up`
4. **Set env vars:**
   - `DATABASE_URL` (from Railway Postgres)
   - `AUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL` (your Railway URL, e.g. `https://northops.up.railway.app`)
   - `FIREFLIES_WEBHOOK_SECRET` (pick a strong secret)
   - `ANTHROPIC_API_KEY` (optional, for AI meeting processing via Claude)
   - `RESEND_API_KEY` + `EMAIL_FROM` (optional, for emails)
5. **Run migrations** in Railway shell:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
6. **Connect Fireflies** — in Fireflies dashboard:
   - Webhook URL: `https://YOUR_DOMAIN/api/webhooks/fireflies`
   - Header: `x-fireflies-secret: YOUR_FIREFLIES_WEBHOOK_SECRET`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add Postgres (Neon integration) or external `DATABASE_URL`
4. Set all env vars from `.env.example`
5. Build command: `prisma generate && prisma migrate deploy && next build`
6. Run seed once via Vercel CLI or Neon SQL console

## Fireflies integration

When a meeting ends, Fireflies POSTs to your webhook. The system:

1. Saves meeting notes + transcript
2. Runs AI extraction (if `ANTHROPIC_API_KEY` set) or falls back to action items
3. Creates tasks, deliverables, timeline events
4. Notifies team + client portal
5. Sends email (if Resend configured)

Test locally with ngrok:

```bash
ngrok http 3000
# Point Fireflies to https://xxxx.ngrok.io/api/webhooks/fireflies
```

## Optional integrations (you configure)

| Service | Env var | Purpose |
|---------|---------|---------|
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | Smart transcript → tasks/deliverables |
| Resend | `RESEND_API_KEY` | Email notifications |
| Stripe | not yet | Payment collection (Phase 4) |
| S3/R2 | not yet | File uploads (Phase 4) |

## Scripts

```bash
npm run dev          # Dev server
npm run build        # Production build
npm run db:migrate   # Run migrations
npm run db:seed      # Seed demo data
npm run db:setup     # Docker + migrate + seed
```
