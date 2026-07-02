# InsightApex — ACCA Practice Platform

A production-ready ACCA quiz learning platform built with **Next.js 14, TypeScript, Tailwind CSS, Prisma, and PostgreSQL**.

---

## What's built (Phase 1)

| Area | Details |
|------|---------|
| **Landing page** | Marketing site with features, papers, how-it-works, and CTA sections |
| **Auth** | Register, login, forgot/reset password, email verification (Resend-ready). Auth.js JWT strategy. |
| **Student dashboard** | Overview stats, score history chart, recent activity, weak topic analysis |
| **Quiz engine** | Paper → Topic → timed MCQ quiz, question flagging, back/next navigation, live progress bar |
| **Results & analysis** | Score, pass/fail, topic breakdown, weak topic recommendations, full answer review with explanations |
| **Admin panel** | Login, dashboard overview, student list with search, paper management, question management with full CRUD |
| **Future-ready** | Prisma models for subscriptions, purchases, certificates; placeholder service files for Stripe, R2, AI |

---

## Quick start

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or cloud — Supabase, Railway, Neon all work)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd insightapex
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in at minimum:
- `DATABASE_URL` — your PostgreSQL connection string
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate one

### 3. Set up the database

```bash
# Push schema to the database
npm run db:push

# OR use migrations (recommended for production)
npm run db:migrate

# Seed with sample data (papers, questions, admin + student accounts)
npm run db:seed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Student | student@insightapex.com | Student@12345 |
| Admin | admin@insightapex.com | Admin@12345 |

---

## Key routes

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page |
| `/register` | Student registration |
| `/login` | Student login |
| `/forgot-password` | Password reset request |
| `/reset-password?token=…` | Password reset form |
| `/dashboard` | Student overview |
| `/dashboard/quiz` | Paper/topic selection + quiz engine |
| `/dashboard/quiz/result?attemptId=…` | Result and analysis |
| `/dashboard/profile` | Account settings |
| `/admin` | Admin overview |
| `/admin/login` | Admin login |
| `/admin/students` | Student management |
| `/admin/papers` | Paper management |
| `/admin/questions` | Question management + creation form |

---

## Useful scripts

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run db:push      # Push Prisma schema (no migration files)
npm run db:migrate   # Create and apply migration
npm run db:seed      # Seed database with sample data
npm run db:studio    # Open Prisma Studio (database GUI)
```

---

## Folder structure

```
insightapex/
├── prisma/
│   ├── schema.prisma          # Full schema (Phase 1 + Phase 2/3 placeholder models)
│   └── seed.ts                # Sample papers, topics, questions, admin + student
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout + SessionProvider
│   │   ├── (auth pages)       # /login /register /forgot-password /reset-password
│   │   ├── dashboard/         # Student dashboard (protected)
│   │   │   ├── layout.tsx     # Sidebar layout (requireStudent guard)
│   │   │   ├── page.tsx       # Overview: stats, chart, recent activity, weak topics
│   │   │   ├── quiz/
│   │   │   │   ├── page.tsx   # Paper→topic selection + full quiz engine
│   │   │   │   └── result/    # Score, breakdown, review
│   │   │   └── profile/       # Account settings
│   │   ├── admin/             # Admin panel (requireAdmin guard)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Overview stats
│   │   │   ├── login/
│   │   │   ├── students/
│   │   │   ├── papers/
│   │   │   └── questions/     # Full question CRUD
│   │   └── api/
│   │       ├── auth/[...nextauth]/  # Auth.js handler
│   │       ├── register/            # Student registration
│   │       ├── verify-email/        # Email verification
│   │       ├── forgot-password/
│   │       ├── reset-password/
│   │       ├── dashboard/           # Overview stats for student
│   │       ├── papers/              # Paper list + topics by paper
│   │       ├── quiz/                # start, submit, result
│   │       └── admin/               # overview, students, papers, questions
│   │
│   ├── components/
│   │   ├── ui/                # Button, Card, Badge, ProgressBar, Input
│   │   ├── marketing/         # Navbar, Footer, AuthLayout
│   │   ├── dashboard/         # DashboardSidebar, StatCard, ScoreChart
│   │   ├── quiz/              # (reserved for extracted quiz sub-components)
│   │   └── admin/             # AdminSidebar
│   │
│   ├── lib/
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── auth.ts            # NextAuth config (JWT, Credentials provider)
│   │   ├── guards.ts          # requireStudent / requireAdmin server helpers
│   │   ├── validation.ts      # Zod schemas
│   │   └── utils.ts           # cn(), formatPercent()
│   │
│   ├── services/
│   │   ├── email/             # Resend-ready email service (dev: console log)
│   │   ├── storage/           # Cloudflare R2-ready file storage stub
│   │   ├── payments/          # Stripe placeholder (hasActiveAccess, TODOs)
│   │   └── ai/                # AI explanation placeholder
│   │
│   ├── hooks/
│   │   └── useTimer.ts        # Quiz countdown timer hook
│   │
│   └── types/
│       └── index.ts           # Shared TypeScript interfaces
│
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT signing |
| `NEXTAUTH_URL` | ✅ | App base URL (e.g. http://localhost:3000) |
| `RESEND_API_KEY` | Optional | Enables real email sending (Resend) |
| `EMAIL_FROM` | Optional | Sender address for emails |
| `R2_ENDPOINT` | Optional | Cloudflare R2 endpoint URL |
| `R2_ACCESS_KEY_ID` | Optional | R2 credentials |
| `R2_SECRET_ACCESS_KEY` | Optional | R2 credentials |
| `R2_BUCKET_NAME` | Optional | R2 bucket name |
| `R2_PUBLIC_BASE_URL` | Optional | Public CDN base URL for R2 objects |

---

## Phase 2 — What to build next

### Payments & Access Control
- Integrate Stripe (subscriptions + one-time paper packs)
- Implement `hasActiveAccess()` in `src/services/payments/` using the Subscription/Purchase Prisma models
- Gate PREMIUM papers behind access checks in quiz API routes
- Add `/pricing` marketing page and `/dashboard/billing` page

### Enhanced Content
- Admin topic management (currently topics exist in DB from seed; add UI to create/edit/delete)
- Question import via CSV
- Question images via Cloudflare R2 (storage service stub already exists)
- Admin ability to edit/delete existing questions

### Certificates
- Auto-generate PDF certificate on passing attempt (Phase 3 placeholder model exists)
- Store in R2, send via email

### AI Features
- Populate `src/services/ai/` using Anthropic API for AI-written explanations
- Add a chat tutor mode scoped to a paper/topic

### Platform
- Email verification enforcement on login
- Google OAuth (add to NextAuth providers array)
- Admin analytics charts
- Bulk question import tool
- Mobile app (React Native sharing types from `src/types/`)
