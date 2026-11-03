# NEXDESK — Enterprise IT Service Management & Asset Intelligence Platform
## Zero-Cost Production Deployment Guide

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Phase:** 1 — Architecture & Specifications  
**Author:** AI Project Orchestrator & Senior DevOps Engineer  

---

## 1. Zero-Cost Deployment Topology

NEXDESK is designed to be fully buildable, testable, and deployable at **zero financial cost** using generous, verified free tiers that require **no credit card entry**:

```mermaid
flowchart TD
    subgraph Users ["Client Browsers"]
        Browser["End Users (Any Device)"]
    end

    subgraph Cloudflare ["Frontend Host: Cloudflare Pages (Free Tier)"]
        CFCDN["Global Edge CDN & SSL"]
        StaticAssets["Static React + Vite SPA Bundle (/dist)"]
        CFCDN --> StaticAssets
    end

    subgraph Render ["Backend Host: Render.com (Free Web Service)"]
        ExpressAPI["Node.js / Express Server Process"]
        HealthProbe["Health Check: /api/v1/health"]
        ExpressAPI --> HealthProbe
    end

    subgraph Supabase ["Database Host: Supabase (Free Tier)"]
        Pooler["PgBouncer Connection Pooler (Port 6543)"]
        DirectPG["PostgreSQL 15+ Core Engine (Port 5432)"]
        Pooler --> DirectPG
    end

    subgraph GitHub ["Automation: GitHub (Free Tier)"]
        Repo["GitHub Repo: gpsofficials-im/nexdesk"]
        Actions["GitHub Actions CI Pipeline"]
        Repo --> Actions
    end

    Browser -- "1. Load UI (HTTPS)" --> CFCDN
    Browser -- "2. API Requests with Session Cookie" --> ExpressAPI
    ExpressAPI -- "3. Prisma Queries (Port 6543)" --> Pooler
    Actions -- "Auto-trigger on git push" --> Cloudflare
```

---

## 2. Infrastructure Provider Overview

| Component | Provider & Tier | Cost | Resource Limits & Behavior |
| :--- | :--- | :---: | :--- |
| **Database** | [Supabase Free](https://supabase.com) | **$0.00** | • 500 MB PostgreSQL database storage.<br>• 2 free projects per organization.<br>• Built-in Supavisor connection pooling.<br>• Auto-pauses after 7 days of inactivity (unpause with 1 click in dashboard). |
| **Backend API** | [Render Free](https://render.com) | **$0.00** | • 750 free instance hours per month.<br>• 512 MB RAM, 0.1 CPU cores.<br>• Automated free Let's Encrypt HTTPS certificate.<br>• Spins down after 15 min of inactivity (50s cold-start on next incoming request). |
| **Frontend** | [Cloudflare Pages](https://pages.cloudflare.com) | **$0.00** | • Unlimited free requests and bandwidth.<br>• Global Anycast CDN.<br>• 500 free builds per month.<br>• Unlimited custom domains and automatic SSL. |
| **CI / Automation**| [GitHub Actions](https://github.com/features/actions) | **$0.00** | • 2,000 free runner minutes per month.<br>• Automated lint, type-check, and Vitest test execution on PRs. |

---

## 3. Step-by-Step Provisioning Guide

### Step 1: Provision Supabase PostgreSQL Database

1. Sign up at [supabase.com](https://supabase.com) using your GitHub account (No credit card required).
2. Click **New Project**:
   * **Organization**: Personal
   * **Project Name**: `nexdesk-prod`
   * **Database Password**: Generate a secure 32-character password and save it in your password manager.
   * **Region**: Choose the region closest to your users (e.g. `us-east-1` or `eu-central-1`).
   * **Pricing Plan**: **Free** ($0 / month).
3. Once the database finishes provisioning (approx. 2 minutes), navigate to **Project Settings** ➔ **Database**:
   * Locate the **Connection String** section and toggle to **URI**.
   * Copy the **Transaction Mode Pooler URI** (Port `6543`):
     ```text
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
     This string will be used as `DATABASE_URL` in Render.
   * Copy the **Direct Connection URI** (Port `5432`):
     ```text
     postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
     This string is used as `DIRECT_URL` for running Prisma migrations.

---

### Step 2: Deploy Backend to Render

1. Sign up at [render.com](https://render.com) using your GitHub account.
2. In the Render Dashboard, click **New +** ➔ **Web Service**.
3. Select **Build and deploy from a Git repository** and connect `gpsofficials-im/nexdesk`.
4. Configure the service settings:
   * **Name**: `nexdesk-api`
   * **Language**: `Node`
   * **Branch**: `main`
   * **Region**: Select the same geographical region as your Supabase database.
   * **Root Directory**: (Leave blank — repository root)
   * **Build Command**:
     ```bash
     npm install && npx prisma generate --schema=server/prisma/schema.prisma && npm run build --workspace=server
     ```
   * **Start Command**:
     ```bash
     npm run start --workspace=server
     ```
   * **Instance Type**: **Free** ($0 / month).
5. Add the **Environment Variables** under the Environment tab:
   * `NODE_ENV`: `production`
   * `PORT`: `10000`
   * `HOST`: `0.0.0.0`
   * `DATABASE_URL`: *(Paste your Supabase pooled connection string)*
   * `DIRECT_URL`: *(Paste your Supabase direct connection string)*
   * `SESSION_SECRET`: *(Generate a secure 64-char random string)*
   * `COOKIE_DOMAIN`: *(Your Render or custom domain, e.g. `onrender.com`)*
   * `COOKIE_SECURE`: `true`
   * `CORS_ORIGIN`: `https://nexdesk.pages.dev` *(Or your Cloudflare Pages URL)*
   * `LOG_LEVEL`: `info`
6. Under **Advanced**, configure the Health Check Path:
   * **Health Check Path**: `/api/v1/health`
7. Click **Create Web Service**. Render will pull the code, compile TypeScript, and boot the server.

---

### Step 3: Deploy Frontend to Cloudflare Pages

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com) using your email.
2. Navigate to **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
3. Select the repository `gpsofficials-im/nexdesk`.
4. Set up the build configuration:
   * **Project name**: `nexdesk`
   * **Production branch**: `main`
   * **Framework preset**: `Vite`
   * **Build command**:
     ```bash
     npm run build --workspace=client
     ```
   * **Build output directory**:
     ```text
     client/dist
     ```
   * **Root directory**: (Leave blank)
5. Add Environment Variables:
   * `NODE_VERSION`: `20.18.0`
   * `VITE_API_URL`: `https://nexdesk-api.onrender.com` *(Your Render backend URL)*
6. Click **Save and Deploy**. Cloudflare's global edge network will build and distribute the React application globally.

---

### Step 4: Run Initial Production Database Migration

Once Supabase and Render are connected, execute the production migration from your local workstation:

```powershell
# Set temporary production DATABASE_URL in your local session (do not commit to git)
$env:DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Apply versioned Prisma migrations to Supabase
npx prisma migrate deploy --schema=server/prisma/schema.prisma

# Seed the initial admin user and baseline system categories
npx tsx server/prisma/seed.ts
```

---

## 4. Pre-Flight Verification Checklist

Before announcing your deployment:
- [ ] **Liveness Probe**: Navigate to `https://nexdesk-api.onrender.com/api/v1/health` in a browser. Confirm response is `200 OK` with JSON `{"status": "healthy"}`.
- [ ] **SSL / HTTPS**: Both frontend (`https://nexdesk.pages.dev`) and backend (`https://...onrender.com`) load with valid Let's Encrypt / Cloudflare SSL locks.
- [ ] **CORS Verification**: Open browser developer console on Cloudflare Pages. Verify that API calls to Render do not produce CORS errors.
- [ ] **Cookie Security**: Inspect the login response headers in devtools. Ensure `nexdesk_session` cookie contains `HttpOnly`, `Secure`, and `SameSite=Lax`.
- [ ] **Zero Secrets Committed**: Verify that `.env` files are never pushed to GitHub (`git status` and GitHub repository browser).
