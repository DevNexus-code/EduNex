# NEXDESK — Enterprise IT Service Management & Asset Intelligence Platform
## Free-Tier Quotas, Operational Behaviors & Limitation Mitigation Guide

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Phase:** 1 — Architecture & Specifications  
**Author:** AI Project Orchestrator & Senior DevOps Engineer  

---

## 1. Executive Summary & Cost Philosophy

NEXDESK strictly enforces a **Zero-Cost Architectural Requirement**:
* **$0.00 Required**: No paid subscriptions, no mandatory credit card entry, no paid hosting, and no paid domain requirements.
* **Portfolio Integrity**: When demonstrating this application to hiring managers and technical interviewers, being able to articulate how you designed around free-tier operational constraints demonstrates senior-level architectural awareness, cost governance, and operational resilience.

This document serves as the single source of truth for free-tier quotas, behaviors, potential risks, and technical mitigations across all external providers.

---

## 2. Provider Quota & Behavior Matrix

| Provider | Component | Free Tier Quota | Observed Behavior When Inactive / Exceeded | Architectural Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **Render** | Backend API Server | • 750 free instance hours / month.<br>• 512 MB RAM.<br>• Shared CPU (0.1 core). | • **15-Minute Spin-Down**: Process is suspended after 15 min without HTTP traffic.<br>• **Cold-Start Delay**: The next inbound request takes **30–50 seconds** to boot the container. | • React frontend includes a graceful "Server Waking Up" banner if `/api/v1/health` takes >2 seconds.<br>• Memory usage strictly capped via Node `--max-old-space-size=400`. |
| **Supabase** | PostgreSQL Database | • 500 MB database storage.<br>• 2 active free projects.<br>• Built-in Supavisor connection pooling. | • **7-Day Auto-Pause**: If no queries are made for 7 consecutive days, the project enters a paused state.<br>• Data remains intact but queries fail until unpaused. | • Can be unpaused with 1 click in the Supabase dashboard.<br>• Automated `seed.ts` script allows repopulating a fresh database in seconds.<br>• PgBouncer pooler (port `6543`) prevents connection exhaustion. |
| **Cloudflare Pages** | Frontend SPA Hosting | • Unlimited bandwidth.<br>• Unlimited requests.<br>• 500 builds / month.<br>• Global Anycast CDN. | • **Zero Cold Starts**: Static React assets are cached at hundreds of edge data centers worldwide.<br>• No spin-down behavior. | • Builds are fast (Vite compiles in ~15s), consuming minimal build quota. |
| **GitHub Actions** | CI / Automation | • 2,000 runner minutes / month (Unlimited for public repos). | • Builds are queued if monthly quota is exhausted. | • Workflows run only on pull requests and pushes to `main`.<br>• Caching (`npm cache`) reduces test run times to under 60 seconds. |

---

## 3. Deep-Dive: Handling Free-Tier Operational Quirks

### 3.1 Managing Render's 50-Second Cold Start

#### The Problem
When testing or showcasing the live demo, the initial page load on Cloudflare Pages is instantaneous, but the first API request to Render may hang for up to 50 seconds while the backend container wakes up. Unprepared users might assume the app is broken.

#### NEXDESK's Architectural Solution
1. **Frontend Health Probe**: On initial load, the React application (`App.tsx`) fires an immediate probe to `GET /api/v1/health`.
2. **Warmup State UI**: If the request takes longer than 2.5 seconds, the UI transitions to an informative warmup status:
   ```
   ⏳ Server waking up from free-tier sleep...
   Render free instances spin down after 15 minutes of inactivity.
   Expected wake time: ~30-45 seconds. Thank you for your patience!
   ```
3. **Automatic Reconnection**: As soon as the health check returns `200 OK`, the banner disappears and the user's session is restored without page reloads.

---

### 3.2 Managing Supabase's 7-Day Auto-Pause

#### The Problem
Free-tier Supabase projects are automatically paused if they receive no database traffic for 7 consecutive days. If a recruiter opens your portfolio after a period of inactivity, database queries will return connection refused errors.

#### NEXDESK's Architectural Solution
1. **Dashboard Unpause**: Navigating to the Supabase dashboard and clicking **Restore Project** unpauses the database in under 2 minutes. All schema, tables, and rows remain 100% intact.
2. **Deterministic Seed Recovery**: In the event a project is lost, deleted, or recreated, running our deterministic seed script restores the complete environment in under 10 seconds:
   ```powershell
   npx prisma migrate deploy --schema=server/prisma/schema.prisma
   npm run db:seed --workspace=server
   ```
3. **Database Capacity Planning**:
   * A full NEXDESK installation with 5,000 tickets, 500 assets, 100 users, and 10,000 audit log rows consumes **less than 35 MB** of storage.
   * Supabase's 500 MB limit provides **>14x headroom**, guaranteeing you will never hit storage caps during demos.

---

### 3.3 Connection Pool Management (Port 6543 vs 5432)

#### The Problem
PostgreSQL allocates a dedicated backend process for every concurrent TCP connection. In free-tier cloud environments, direct connections are strictly capped (often 10–20 connections). When multiple users or serverless lambdas hit the database, connections are rapidly exhausted (`53300: sorry, too many clients already`).

#### NEXDESK's Architectural Solution
* We configure Prisma to route all application traffic through **Supavisor Transaction Connection Pooling** on port **`6543`**:
  ```env
  DATABASE_URL="postgresql://postgres.[REF]:[PW]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
  ```
* Direct connections (port **`5432`**) are reserved exclusively for executing structural schema migrations via `DIRECT_URL`:
  ```env
  DIRECT_URL="postgresql://postgres:[PW]@db.[REF].supabase.co:5432/postgres"
  ```

---

## 4. Interview Talking Points: Cost & DevOps Architecture

When discussing NEXDESK in job interviews, use these key architectural points to demonstrate your senior-level understanding:

1. **"Why did you choose Cloudflare Pages + Render + Supabase over AWS or GCP?"**  
   * *Answer*: "For an enterprise portfolio demonstration, avoiding cloud bill shock and credit card requirements was a strict constraint. By decoupling the static frontend onto Cloudflare's edge CDN, running the API on Render, and using Supabase's pooled PostgreSQL, I achieved full HTTPS, automated CI/CD, and global distribution with a guaranteed **$0.00 operating cost**."
2. **"How did you engineer around server cold starts?"**  
   * *Answer*: "Rather than masking the latency or paying for warm instances, I treated the cold-start as a UX design requirement. The frontend detects API latency through an initial health check probe and displays a branded, informative status banner that educates the user on cloud economics."
3. **"How do you safeguard against data loss on free tiers?"**  
   * *Answer*: "All database schema changes are strictly versioned as declarative SQL migrations in Prisma. Seed data is deterministic and reproducible via `seed.ts`. Even if the entire cloud database is destroyed, the complete schema and operational dataset can be restored from source control in under 30 seconds."
