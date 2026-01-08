# BuilderOS

**AI-powered operational system for residential construction management**

BuilderOS streamlines the entire home building process — from land sourcing and subcontractor coordination to inspection readiness and procurement optimization. Built for spec home builders who want to scale efficiently.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Core Modules](#core-modules)
- [API Reference](#api-reference)
- [AI Features](#ai-features)
- [Background Jobs](#background-jobs)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Features

### Land Sourcing
- **AI Lot Scoring** — Automatically score lots based on school ratings, zoning, utilities, comparables, margin potential, and seller motivation
- **Daily Digest** — AI-generated summary of top opportunities and market insights
- **Deal Pipeline** — Track lots from discovery through purchase with customizable stages
- **Comparable Analysis** — Automatic comp fetching and analysis

### Subcontractor Coordination
- **Reliability Scoring** — Track on-time rate, quality ratings, and responsiveness
- **Smart Scheduling** — AI-optimized scheduling with weather and dependency awareness
- **Automated Confirmations** — SMS/email sequences at 48h, 24h, and 2h before scheduled work
- **Performance Analytics** — Historical performance tracking and trend analysis

### Inspection Readiness
- **AI Pre-Audits** — Photo analysis to identify potential issues before inspector arrives
- **Dynamic Checklists** — Jurisdiction-specific checklists with common fail reasons
- **Inspector Intelligence** — Track inspector preferences and common callouts
- **Photo Documentation** — Organized photo storage with AI tagging

### Procurement
- **Price Tracking** — Monitor material prices over time
- **Price Forecasting** — AI predictions for optimal ordering timing
- **Volume Optimization** — Consolidated ordering across builds for better pricing
- **Supplier Management** — Track supplier performance and terms

### Build Management
- **Project Timeline** — Gantt-style view with critical path analysis
- **Task Management** — Phase-based task tracking with dependencies
- **Financial Tracking** — Budget vs. actual with margin projections
- **Draw Documentation** — Streamlined draw preparation and submission

### Analytics
- **Real-time Dashboard** — Key metrics at a glance
- **Time Tracking** — Understand where time is spent across activities
- **Margin Analysis** — Build-by-build profitability tracking
- **Sub Performance Reports** — Identify top performers and those needing attention

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│                    └── React + Tailwind CSS                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API (Fastify)                           │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│    │  Routes  │  │ Services │  │    AI    │  │  Jobs    │      │
│    └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │PostgreSQL│  │  Redis   │  │ Claude   │
              │ + PostGIS│  │ (Queue)  │  │   API    │
              └──────────┘  └──────────┘  └──────────┘
```

### Design Principles

- **Modular Monolith** — Clear bounded contexts ready for future microservices extraction
- **Multi-tenant** — Organization-based isolation from day one
- **AI-First** — Every module has AI-powered features, with manual fallbacks
- **Type-Safe** — Full TypeScript across frontend, backend, and database

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React 18, Tailwind CSS, Zustand |
| **Backend** | Fastify, Node.js 20, TypeScript |
| **Database** | PostgreSQL 16 + PostGIS + pgvector |
| **ORM** | Prisma |
| **Queue** | BullMQ + Redis |
| **Search** | Meilisearch |
| **AI** | Anthropic Claude API |
| **Auth** | Clerk |
| **Storage** | Cloudflare R2 |
| **SMS** | Twilio |
| **Email** | Resend |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### 1. Clone and Install

```bash
git clone https://github.com/reecemullins/AI_Homebuilder_OS.git
cd AI_Homebuilder_OS
npm install
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and Meilisearch
docker-compose up -d postgres redis meilisearch
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values (at minimum):
# - DATABASE_URL (pre-configured for Docker)
# - ANTHROPIC_API_KEY (for AI features)
```

### 4. Initialize Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with demo data
npx tsx scripts/seed-data.ts
```

### 5. Start Development Servers

```bash
# Start both API and Web in development mode
npm run dev
```

This starts:
- **API** at http://localhost:3001
- **Web** at http://localhost:3000
- **API Docs** at http://localhost:3001/docs

### 6. Start Background Worker (Optional)

```bash
# In a separate terminal
npm run start:worker
```

---

## Development Setup

### Running Individual Services

```bash
# API only
npm run dev --filter=@builderos/api

# Web only
npm run dev --filter=@builderos/web

# Worker only
npm run start:worker --filter=@builderos/api
```

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes (development)
npm run db:push

# Create migration (production)
npm run db:migrate

# Open Prisma Studio (database GUI)
cd packages/database && npx prisma studio
```

### Building for Production

```bash
# Build all packages
npm run build

# Build specific package
npm run build --filter=@builderos/api
```

### Running Tests

```bash
npm run test
```

---

## Project Structure

```
builderos/
├── apps/
│   ├── api/                      # Fastify backend
│   │   ├── src/
│   │   │   ├── index.ts          # Server entry point
│   │   │   ├── routes/           # API route handlers
│   │   │   │   ├── lots.ts       # /api/v1/lots
│   │   │   │   ├── builds.ts     # /api/v1/builds
│   │   │   │   ├── schedule.ts   # /api/v1/schedule
│   │   │   │   ├── subs.ts       # /api/v1/subs
│   │   │   │   ├── inspections.ts
│   │   │   │   ├── procurement.ts
│   │   │   │   ├── draws.ts
│   │   │   │   ├── analytics.ts
│   │   │   │   └── ai.ts         # /api/v1/ai
│   │   │   ├── services/         # Business logic
│   │   │   │   ├── lot.service.ts
│   │   │   │   ├── build.service.ts
│   │   │   │   ├── schedule.service.ts
│   │   │   │   ├── sub.service.ts
│   │   │   │   ├── inspection.service.ts
│   │   │   │   ├── procurement.service.ts
│   │   │   │   └── analytics.service.ts
│   │   │   ├── jobs/             # Background job handlers
│   │   │   │   ├── index.ts      # Queue definitions
│   │   │   │   ├── worker.ts     # Worker entry point
│   │   │   │   ├── lot-jobs.ts
│   │   │   │   ├── sub-jobs.ts
│   │   │   │   ├── inspection-jobs.ts
│   │   │   │   ├── procurement-jobs.ts
│   │   │   │   └── analytics-jobs.ts
│   │   │   └── middleware/       # Auth, error handling
│   │   └── package.json
│   │
│   └── web/                      # Next.js frontend
│       ├── app/
│       │   ├── page.tsx          # Landing page
│       │   ├── layout.tsx        # Root layout
│       │   └── dashboard/        # Dashboard pages
│       │       ├── page.tsx      # Main dashboard
│       │       ├── layout.tsx    # Dashboard layout
│       │       ├── lots/
│       │       ├── builds/
│       │       ├── subs/
│       │       ├── schedule/
│       │       ├── inspections/
│       │       ├── procurement/
│       │       ├── draws/
│       │       └── analytics/
│       ├── components/
│       │   ├── ui/               # Base UI components
│       │   └── [module]/         # Module-specific components
│       ├── lib/
│       │   ├── api.ts            # API client
│       │   └── utils.ts          # Utilities
│       └── package.json
│
├── packages/
│   ├── database/                 # Prisma schema & client
│   │   ├── prisma/
│   │   │   └── schema.prisma     # Database schema
│   │   └── src/
│   │       ├── client.ts         # Prisma client singleton
│   │       └── index.ts          # Exports
│   │
│   ├── types/                    # Shared TypeScript types
│   │   └── src/
│   │       ├── lot.ts
│   │       ├── build.ts
│   │       ├── sub.ts
│   │       ├── inspection.ts
│   │       ├── procurement.ts
│   │       ├── analytics.ts
│   │       └── index.ts
│   │
│   └── config/                   # Shared configuration
│       └── src/
│           └── scoring.ts        # Scoring weights & thresholds
│
├── scripts/
│   └── seed-data.ts              # Database seeding
│
├── docker-compose.yml            # Local development services
├── Dockerfile.api                # API container
├── Dockerfile.web                # Web container
├── turbo.json                    # Turborepo configuration
├── package.json                  # Root package.json
└── .env.example                  # Environment template
```

---

## Core Modules

### Lots Module

Manage your land sourcing pipeline from discovery to purchase.

**Key Features:**
- Import lots from MLS, wholesalers, or manual entry
- AI-powered scoring (0-100) based on multiple factors
- Track status through pipeline stages
- Store and analyze comparable sales
- Log all contact attempts and notes

**Statuses:** `NEW` → `REVIEWING` → `CONTACTED` → `NEGOTIATING` → `UNDER_CONTRACT` → `DUE_DILIGENCE` → `PURCHASED`

### Builds Module

Track construction projects from permit to sale.

**Key Features:**
- Associate with purchased lots and floor plans
- Phase-based progress tracking
- Task management with dependencies
- Budget vs. actual financial tracking
- Photo documentation by phase

**Phases:** `PRE_CONSTRUCTION` → `PERMITTING` → `SITE_WORK` → `FOUNDATION` → `FRAMING` → `ROUGH_INS` → `INSULATION_DRYWALL` → `FINISHES` → `FINAL` → `PUNCH_LIST` → `COMPLETE`

### Subcontractors Module

Manage your trade partner network.

**Key Features:**
- Track by trade (framing, electrical, plumbing, etc.)
- Reliability scoring based on performance history
- Availability checking and scheduling
- Automated confirmation sequences
- Rating and feedback after each job

**Trades:** `FRAMING`, `ELECTRICAL`, `PLUMBING`, `HVAC`, `CONCRETE`, `ROOFING`, `DRYWALL`, `PAINT`, `FLOORING`, `CABINETS`, `TILE`, `TRIM`, `LANDSCAPING`, and more

### Inspections Module

Never fail an inspection again.

**Key Features:**
- Schedule and track all inspection types
- Jurisdiction-specific checklists
- AI photo analysis for pre-inspection audits
- Inspector preference tracking
- Pass/fail history and common issues

**Types:** `FOOTING`, `FOUNDATION`, `SLAB`, `FRAMING`, `ROUGH_ELECTRICAL`, `ROUGH_PLUMBING`, `ROUGH_HVAC`, `INSULATION`, `DRYWALL`, `FINAL_*`, `CERTIFICATE_OF_OCCUPANCY`

### Procurement Module

Optimize material purchasing.

**Key Features:**
- Supplier database with performance tracking
- Purchase order management
- Material price tracking over time
- AI price forecasting
- Volume discount optimization across builds

### Analytics Module

Data-driven decision making.

**Key Features:**
- Real-time dashboard metrics
- Time tracking by category and build
- Margin analysis by build
- Subcontractor performance reports
- Trend visualization

---

## API Reference

All endpoints are prefixed with `/api/v1` and require authentication.

### Lots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/lots` | List lots with filters |
| `POST` | `/lots` | Create new lot |
| `GET` | `/lots/:id` | Get lot details |
| `PATCH` | `/lots/:id` | Update lot |
| `DELETE` | `/lots/:id` | Delete lot |
| `POST` | `/lots/:id/score` | AI score/rescore lot |
| `GET` | `/lots/:id/comparables` | Get comparable sales |
| `POST` | `/lots/:id/contact` | Log contact attempt |
| `GET` | `/lots/digest` | Get daily AI digest |

### Builds

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/builds` | List builds |
| `POST` | `/builds` | Create build from lot |
| `GET` | `/builds/:id` | Get build details |
| `PATCH` | `/builds/:id` | Update build |
| `GET` | `/builds/:id/timeline` | Get Gantt timeline data |
| `GET` | `/builds/:id/financials` | Get financial summary |
| `POST` | `/builds/:id/tasks` | Add task |
| `PATCH` | `/builds/:id/tasks/:taskId` | Update task |
| `POST` | `/builds/:id/photos` | Upload photo |

### Schedule

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/schedule` | Get schedule entries |
| `POST` | `/schedule` | Create schedule entry |
| `PATCH` | `/schedule/:id` | Update entry |
| `POST` | `/schedule/optimize` | AI schedule optimization |
| `POST` | `/schedule/resequence` | Handle delay cascading |

### Subcontractors

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/subs` | List subcontractors |
| `POST` | `/subs` | Add subcontractor |
| `GET` | `/subs/:id` | Get sub with history |
| `PATCH` | `/subs/:id` | Update sub |
| `POST` | `/subs/:id/rate` | Add rating |
| `GET` | `/subs/:id/availability` | Check availability |
| `GET` | `/subs/recommend` | AI sub recommendation |

### Inspections

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/inspections` | List inspections |
| `POST` | `/inspections` | Schedule inspection |
| `GET` | `/inspections/:id` | Get inspection details |
| `PATCH` | `/inspections/:id` | Update results |
| `GET` | `/inspections/:id/checklist` | Get/generate checklist |
| `POST` | `/inspections/:id/photos` | Upload photo |
| `POST` | `/inspections/:id/pre-audit` | Run AI pre-audit |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/ai/lot-score` | Score a lot |
| `POST` | `/ai/schedule-optimize` | Optimize build schedule |
| `POST` | `/ai/photo-analyze` | Analyze inspection photo |
| `POST` | `/ai/checklist-generate` | Generate inspection checklist |
| `POST` | `/ai/daily-digest` | Generate daily digest |

---

## AI Features

BuilderOS uses Claude (Anthropic) for intelligent automation:

### Lot Scoring
Analyzes multiple factors to generate a 0-100 score:
- School district quality (weight: 15%)
- Zoning compatibility (weight: 20%)
- Utility availability (weight: 15%)
- Comparable sales analysis (weight: 20%)
- Margin potential estimate (weight: 20%)
- Seller motivation signals (weight: 10%)

### Schedule Optimization
Considers constraints to generate optimal schedules:
- Task dependencies and critical path
- Weather forecasts for exterior work
- Subcontractor availability
- Inspection timing requirements
- Buffer time recommendations

### Inspection Pre-Audit
Analyzes photos before inspections:
- Identifies potential code violations
- Flags missing items (nail plates, fire blocking, etc.)
- Provides remediation recommendations
- Estimates fix time for issues
- Calculates readiness score

### Daily Digest
AI-generated summary including:
- Top lot opportunities with investment thesis
- Price changes and expiring deals
- Market insights and trends
- Recommended actions

---

## Background Jobs

Jobs are processed using BullMQ with Redis.

### Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `import-mls` | Daily 6 AM | Import new MLS listings |
| `score-new` | Daily 7 AM | Score unscored lots |
| `generate-digest` | Daily 8 AM | Generate daily digests |
| `refresh-comps` | Weekly Sunday | Refresh comparable sales |
| `update-reliability` | Daily midnight | Recalculate sub scores |
| `track-prices` | Mon/Wed/Fri 9 AM | Track material prices |
| `check-alerts` | Daily 10 AM | Check price alerts |
| `daily-metrics` | Daily 1 AM | Calculate dashboard metrics |
| `margin-analysis` | Monthly 1st | Run margin analysis |

### Event-Triggered Jobs

| Job | Trigger | Description |
|-----|---------|-------------|
| `send-confirmation` | Schedule entry created | Queue 48h/24h/2h confirmations |
| `process-response` | SMS webhook | Parse sub responses |
| `pre-audit` | 24h before inspection | Run AI pre-audit |
| `photo-analyze` | Photo uploaded | AI photo analysis |

### Running the Worker

```bash
# Development
npm run start:worker

# Production (Docker)
docker-compose up worker
```

---

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/builderos"
REDIS_URL="redis://localhost:6379"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# AI (Required for AI features)
ANTHROPIC_API_KEY=sk-ant-...

# Communications (Optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
RESEND_API_KEY=re_...

# Storage (Optional)
CLOUDFLARE_R2_ACCESS_KEY=...
CLOUDFLARE_R2_SECRET_KEY=...
CLOUDFLARE_R2_BUCKET=builderos
CLOUDFLARE_R2_ENDPOINT=...

# Maps (Optional)
GOOGLE_MAPS_API_KEY=...
MAPBOX_ACCESS_TOKEN=pk...

# Feature Flags
ENABLE_AI_PHOTO_ANALYSIS=true
ENABLE_AUTO_SCHEDULING=true
ENABLE_PRICE_FORECASTING=true
```

### Scoring Configuration

Edit `packages/config/src/scoring.ts` to adjust:

```typescript
// Lot scoring weights (must sum to 1.0)
weights: {
  schoolRating: 0.15,
  zoningCompatibility: 0.20,
  utilityAvailability: 0.15,
  compScore: 0.20,
  marginEstimate: 0.20,
  sellerMotivation: 0.10,
}

// Thresholds
thresholds: {
  minSchoolRating: 5,      // Minimum acceptable school rating
  minMargin: 0.18,         // Minimum target margin (18%)
  maxDaysOnMarket: 180,    // Max DOM for consideration
  maxPrice: 150000,        // Max lot price (market-dependent)
}
```

---

## Deployment

### Docker Compose (Recommended for Development)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

#### API (Railway/Render)

```yaml
# railway.toml
[build]
  builder = "dockerfile"
  dockerfilePath = "Dockerfile.api"

[deploy]
  startCommand = "node apps/api/dist/index.js"
  healthcheckPath = "/health"
```

#### Web (Vercel)

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build --filter=@builderos/web",
  "outputDirectory": "apps/web/.next"
}
```

#### Database (Recommended Providers)

- **PostgreSQL**: Neon, Supabase, Railway
- **Redis**: Upstash, Railway, Redis Cloud

### Health Checks

- API: `GET /health` returns `{ status: "ok", timestamp: "..." }`
- Database: Prisma connection test on startup
- Redis: Connection test via BullMQ

---

## Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make changes following existing patterns
3. Ensure TypeScript compilation passes
4. Test changes locally
5. Submit PR with clear description

### Code Style

- TypeScript strict mode
- Functional components in React
- Services contain business logic
- Routes are thin controllers
- Use Zod for validation

### Adding a New Module

1. Add Prisma models in `packages/database/prisma/schema.prisma`
2. Add types in `packages/types/src/`
3. Create route handler in `apps/api/src/routes/`
4. Create service in `apps/api/src/services/`
5. Add frontend pages in `apps/web/app/dashboard/`
6. Register routes in `apps/api/src/index.ts`

---

## License

Private - All rights reserved

---

## Support

For issues and feature requests, please open a GitHub issue.
