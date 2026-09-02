# Vexyr AI — AI-Powered Business Assistant SaaS

Vexyr is a **multi-tenant SaaS platform** that lets businesses deploy AI agents to handle customer conversations, manage appointments, and automate workflows — all from a single, branded dashboard.

---

## 🚀 Features

### Core Platform
- **Multi-tenant Architecture** — Each business gets its own subdomain (e.g., `mybusiness.localhost:3000`)
- **AI Agents** — Configurable AI agents with custom prompts, models, personality, and business rules
- **Live Chat** — Real-time customer conversations managed by AI or human agents
- **Appointment Booking** — AI-powered scheduling with calendar management
- **Knowledge Base (RAG)** — Upload documents (PDF, TXT, FAQ) to train your AI agent
- **Customer Management** — Track customers, conversation history, and interactions

### Business Tools
- **Team Management** — Invite team members with role-based access (Owner, Manager, Staff, Receptionist)
- **Email Broadcasts** — Send marketing emails to customers
- **Follow-up Automation** — Automated follow-up messages after appointments
- **Custom Email Templates** — Per-tenant branded email templates
- **Billing & Subscriptions** — Stripe-powered subscription plans with modular add-ons

### Auth & Security
- **Email Verification** — Full verification flow for all registration types
- **Invite System** — Secure token-based team invitations
- **Row Level Security (RLS)** — All data is isolated per tenant at the database level
- **Password Reset** — Secure email-based password recovery

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Database & Auth | [Supabase](https://supabase.com) (PostgreSQL + Auth) |
| AI | [OpenRouter](https://openrouter.ai) (via OpenAI-compatible SDK) |
| Payments | [Stripe](https://stripe.com) |
| Email (SMTP) | Custom SMTP (Gmail, SendGrid, etc.) |
| Styling | Vanilla CSS |
| Icons | [Lucide React](https://lucide.dev) |

---

## 📋 Prerequisites

Make sure the following are installed on your machine:

- **Node.js** v18 or higher — [Download](https://nodejs.org)
- **npm** v9 or higher (comes with Node.js)
- **Stripe CLI** — [Install Guide](https://stripe.com/docs/stripe-cli) (required for local webhook testing)
- A **Supabase** project — [Create one free](https://supabase.com)
- A **Stripe** account — [Sign up free](https://stripe.com)
- An **OpenRouter** API key — [Get one](https://openrouter.ai)

---

## ⚡ Getting Started

### Step 1 — Clone the Repository

```bash
git clone https://github.com/twinkalBmvsi/vexyr-ai.git
cd vexyr-ai
```

### Step 2 — Install Dependencies

```bash
npm install
```

### Step 3 — Set Up the Database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Open **SQL Editor** and paste the contents of [`schema.sql`](./schema.sql)
4. Click **Run** to create all tables, RLS policies, and indexes

### Step 4 — Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.example .env.local   # if example exists, otherwise create manually
```

Fill in the following values:

```env
# ── Supabase ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE=your-supabase-service-role-key

# ── AI (OpenRouter) ───────────────────────────────────────
OPENROUTER_API_KEY=sk-or-v1-...

# ── Stripe ────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # fill after Step 6

# ── SMTP Email (optional but recommended) ─────────────────
# Without SMTP, Supabase sends emails using its default delivery.
# With SMTP, you get custom branded emails for signup, invites, password reset.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password       # Gmail: use App Passwords, not your main password
SMTP_FROM="Vexyr <your-email@gmail.com>"
SMTP_SECURE=false                 # true for port 465 (implicit TLS)
SMTP_STARTTLS=true                # true for port 587 (STARTTLS)

# ── App URL ───────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ROOT_DOMAIN=localhost
```

> **Supabase keys kahan milenge?**
> Dashboard → Project Settings → API → copy `URL`, `anon public`, and `service_role` keys.

> **Gmail App Password kaise banayein?**
> Google Account → Security → 2-Step Verification → App Passwords → Generate for "Mail"

### Step 5 — Configure Supabase Auth Settings

In your Supabase Dashboard:

1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to `http://localhost:3000`
3. Add to **Redirect URLs**: `http://localhost:3000/auth/confirm`
4. Go to **Authentication → Email Templates** — you can leave defaults (custom emails work via SMTP)

### Step 6 — Start the Dev Server

```bash
npm run dev
```

App will be available at: **http://localhost:3000**

### Step 7 — Set Up Stripe Webhooks (Local)

In a separate terminal, run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will print a webhook signing secret:
```
Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxx
```

Copy this value and paste it as `STRIPE_WEBHOOK_SECRET` in your `.env.local`, then restart the dev server.

---

## 🗂️ Project Structure

```
vexyr-ai/
├── app/
│   ├── [tenantSlug]/          # Tenant-specific dashboard (served via subdomain rewrite)
│   │   ├── agents/            # AI Agent management
│   │   ├── appointments/      # Appointment calendar & list
│   │   ├── customers/         # Customer directory
│   │   ├── live-chats/        # Real-time conversation inbox
│   │   ├── billing/           # Subscription & invoice management
│   │   ├── connections/       # Channel integrations (WhatsApp, Telegram, Web)
│   │   ├── store/             # Add-on modules marketplace
│   │   └── settings/          # Org settings, team, email templates, security
│   ├── auth/                  # Auth routes (confirm, callback, signout)
│   ├── api/                   # API routes
│   │   ├── chat/              # AI chat endpoint
│   │   ├── stripe/            # Stripe webhook & billing
│   │   ├── team/              # Team invite & permissions
│   │   ├── marketing/         # Email broadcast API
│   │   └── auth/              # Auth utilities (resend verification)
│   ├── login/                 # Login page
│   ├── signup/                # Registration page
│   ├── verify-email/          # Email verification waiting page
│   ├── invite/                # Invite handler (legacy hash-fragment flow)
│   ├── forgot-password/       # Password reset request
│   ├── reset-password/        # New password form
│   └── org-selector/          # Organization picker after login
├── components/                # Shared React components
├── utils/
│   ├── supabase/              # Supabase client (server, client, middleware, service-role)
│   └── email/                 # SMTP email sender + auth email templates
├── middleware.ts               # Subdomain routing & auth middleware
└── schema.sql                 # Full PostgreSQL database schema
```

---

## 🔐 How Multi-Tenancy Works

Vexyr uses **subdomain-based multi-tenancy**:

- Main app runs on `localhost:3000` (login, signup, org selection)
- Each tenant's dashboard is served at `{tenant-slug}.localhost:3000`
- The `middleware.ts` file intercepts subdomain requests and rewrites them to `app/[tenantSlug]/` pages
- All database queries are isolated by `tenant_id` using Supabase Row Level Security (RLS)

For local development with subdomains, you can either:
- Use `localhost` directly (limited — only works on Chrome for some paths)
- Use `localtest.me` which auto-resolves `*.localtest.me` to `127.0.0.1`

---

## 📧 Email Verification Flows

| Registration Type | SMTP ON | SMTP OFF |
|---|---|---|
| **Signup** | Custom branded email via SMTP → `/verify-email` page | Supabase native email → `/verify-email` page |
| **Team Invite** | Custom invite email → `/auth/confirm` → `/invite/accept` | Supabase native invite → `/invite` (hash handler) |
| **Password Reset** | Custom reset email via SMTP | Supabase native reset email |

---

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Type-check without emitting
npx tsc --noEmit

# Lint code
npm run lint

# Build for production
npm run build

# Start production server
npm start

# Stripe webhook listener (run in separate terminal)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Sync Stripe prices to database
node scripts/sync-stripe-prices.js
```

---

## 🗃️ Database Schema Overview

| Table | Purpose |
|---|---|
| `tenants` | Organizations / businesses |
| `users` | Team members linked to tenants |
| `subscriptions` | Stripe subscription state |
| `agents` | AI agent configurations |
| `channels` | Messaging channels (WhatsApp, Telegram, Web) |
| `customers` | End-user / customer records |
| `conversations` | Chat threads per customer |
| `messages` | Individual messages in conversations |
| `appointments` | Booked appointments |
| `calendars` | Calendar configurations |
| `knowledge` | Knowledge base collections |
| `documents` | Uploaded documents for RAG |
| `document_chunks` | Chunked + embedded document content (pgvector) |
| `team_invites` | Pending team invitation tokens |
| `stripe_prices` | Synced Stripe product prices |
| `email_templates` | Per-tenant custom email templates |
| `subscriptions` | Active Stripe subscriptions with modules |

---

## 🚢 Deploying to Production

1. Deploy to [Vercel](https://vercel.com) by connecting your GitHub repository
2. Set all environment variables in the Vercel dashboard
3. Update `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_ROOT_DOMAIN` to your real domain
4. Update Supabase **Redirect URLs** to include your production domain
5. Configure a real **Stripe webhook endpoint** pointing to `https://yourdomain.com/api/stripe/webhook`
6. Make sure your SMTP provider is configured for production sending

---

## 📄 License

Private — All rights reserved © Vexyr
