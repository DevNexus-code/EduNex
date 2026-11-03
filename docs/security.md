# NEXDESK — Enterprise IT Service Management & Asset Intelligence Platform
## Security Architecture, Threat Model & Governance Plan

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Phase:** 1 — Architecture & Specifications  
**Author:** AI Project Orchestrator & Senior Software Architect  

---

## 1. Security Philosophy & Threat Modeling

NEXDESK operates under a **Defense-in-Depth** and **Zero-Trust Server-Side Enforcement** security posture. The core tenet is that the client-side user interface is untrusted. Every inbound request is treated as hostile until authenticated, authorized, and schema-validated at the server boundary.

### 1.1 STRIDE Threat Assessment

| Threat Category | Potential Attack Vector | NEXDESK Mitigation Strategy |
| :--- | :--- | :--- |
| **Spoofing** | Credential stuffing, session hijacking | Argon2id/bcrypt password hashing, cryptographically random 256-bit session tokens, `HttpOnly` + `Secure` + `SameSite` cookies, rate-limiting on login. |
| **Tampering** | Parameter manipulation (e.g. employee modifying another user's ticket status) | Strict server-side RBAC and resource ownership verification. Input schema enforcement via Zod (`stripUnknown`). Parameterized Prisma queries. |
| **Repudiation** | An agent denies resolving or reassigning an asset/ticket | Immutable append-only `AuditLog` table capturing actor ID, timestamp, IP address, user agent, and payload diffs. |
| **Information Disclosure** | Leakage of internal work notes, customer PII, or credentials in logs | Dual-tier comment filtering (stripping `isInternal = true` for non-agents). Automated Pino logger redaction for sensitive fields. |
| **Denial of Service (DoS)** | Brute force login flooding, unbounded search queries | IP-based rate limiting on sensitive routes (auth, search). Strict database query pagination (`limit` capped at 100). |
| **Elevation of Privilege** | An employee passing `"role": "ADMIN"` in a profile update payload | User roles cannot be updated through standard profile endpoints. Role modification requires dedicated admin endpoints gated by `requireRole([ADMIN])`. |

---

## 2. Authentication & Session Security

### 2.1 Password Hashing Specification
* Passwords must be hashed using **Argon2id** (recommended) or **bcrypt** with a minimum work factor of 12.
* Passwords are never stored, logged, or cached in plaintext under any circumstances.
* Password complexity rule enforced at validation: Minimum 10 characters, at least one uppercase letter, one lowercase letter, one digit, and one special character.

### 2.2 Session Management Architecture
* **Stateful Database Sessions**: Avoid stateless JWTs in local storage (vulnerable to XSS theft and difficult to revoke instantly). Sessions are stored in the PostgreSQL `sessions` table.
* **Token Hashing**: The client receives a random 32-byte cryptographically secure token. The database stores only a SHA-256 hash of this token. In the event of a database dump, active sessions cannot be hijacked without the pre-image.
* **Cookie Attributes**:
  * `HttpOnly: true` (Inaccessible to JavaScript, neutralizing XSS credential theft).
  * `SameSite: Lax` (Blocks cross-site request forgery while preserving standard top-level navigation).
  * `Secure: true` (Transmitted only over HTTPS; configurable to false only in local development).
  * `Path: /`
  * `Max-Age: 86400` (24 hours standard lifetime; renewed on activity).

### 2.3 Brute-Force & Rate Limiting Protection
* Mounted at `/api/v1/auth/login`: Maximum 5 failed login attempts per IP per 60-second window.
* Exceeded limits trigger an HTTP `429 Too Many Requests` with a `Retry-After` header.

---

## 3. Server-Side Authorization (RBAC) & Ownership Matrix

### 3.1 Role Hierarchy & Permissions

```
                    ┌─────────────┐
                    │    ADMIN    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  TEAM_LEAD  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  IT_AGENT   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  EMPLOYEE   │
                    └─────────────┘
```

| Action / Capability | `EMPLOYEE` | `IT_AGENT` | `TEAM_LEAD` | `ADMIN` |
| :--- | :---: | :---: | :---: | :---: |
| Create support ticket | Yes | Yes | Yes | Yes |
| View own tickets & comments | Yes | Yes | Yes | Yes |
| View all organization tickets | No | Yes | Yes | Yes |
| View/Add internal work notes | No | Yes | Yes | Yes |
| Reassign tickets / change priority | No | Yes | Yes | Yes |
| Override SLA deadline | No | No | Yes | Yes |
| View full asset inventory | No | Yes | Yes | Yes |
| Assign / return physical hardware | No | Yes | Yes | Yes |
| Decommission / retire assets | No | No | Yes | Yes |
| Manage software license pools | No | No | Yes | Yes |
| Manage users & security roles | No | No | No | Yes |
| View system audit logs | No | No | No | Yes |

### 3.2 Resource Ownership Enforcement
Authorization checks occur in two stages:
1. **Role Guard (`requireRole`)**: Verifies the user has the baseline role tier.
2. **Ownership Guard**: For roles with scoped visibility (such as `EMPLOYEE`), the service layer verifies ownership:
   ```typescript
   if (user.role === Role.EMPLOYEE && ticket.creatorId !== user.id) {
     throw new ForbiddenError('You are not authorized to view this ticket.');
   }
   ```

---

## 4. Input Validation & Data Hygiene

### 4.1 Schema Perimeter Defense (Zod)
All HTTP controllers pass incoming payloads through typed Zod schemas. 
* Extraneous fields are automatically stripped (`stripUnknown: true`).
* Types, bounds, and string formats (email, UUID, date) are strictly validated before business services are invoked.

### 4.2 Injection Prevention
* **SQL Injection**: Prevented categorically by **Prisma ORM**, which utilizes parameterized prepared statements for all database operations. Raw SQL queries (`$queryRaw`) are forbidden unless accompanied by an explicit security review and parameter tagging.
* **Cross-Site Scripting (XSS)**:
  * React automatically escapes variables rendered in JSX.
  * HTTP Security Headers configured via **Helmet**:
    * `Content-Security-Policy`: Disallows unauthorized inline scripts.
    * `X-Content-Type-Options: nosniff`.
    * `X-Frame-Options: DENY` (Clickjacking prevention).
    * `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

---

## 5. Secrets Management & Logging Sanitization

### 5.1 Environment Variable Validation
* Secrets (`DATABASE_URL`, `SESSION_SECRET`, `CORS_ORIGIN`) are never committed to version control.
* A Zod configuration validator (`server/src/common/config/index.ts`) verifies that all required environment variables are present and well-formed during process startup. If a variable is missing, the application halts immediately with a clear startup error.

### 5.2 Structured Log Masking
The **Pino** logger configuration includes an automatic redaction dictionary:
```typescript
redact: {
  paths: [
    'req.headers.cookie',
    'req.headers.authorization',
    '*.password',
    '*.passwordHash',
    '*.token',
    '*.sessionToken',
    '*.secret'
  ],
  censor: '[REDACTED]'
}
```
Sensitive data is replaced with `[REDACTED]` before outputting to streams, preventing credentials from entering log aggregation systems.

---

## 6. Audit Trail Architecture

Security-sensitive events automatically trigger an entry in the `AuditLog` table:
* `USER_LOGIN_SUCCESS` / `USER_LOGIN_FAILURE`
* `USER_ROLE_CHANGED`
* `TICKET_STATUS_CHANGED`
* `TICKET_ASSIGNED`
* `ASSET_ASSIGNED` / `ASSET_RETURNED` / `ASSET_RETIRED`
* `LICENSE_ALLOCATED` / `LICENSE_REVOKED`

Each log captures:
* Exact UTC timestamp (`TIMESTAMPTZ`).
* Actor User ID (or `SYSTEM`).
* Client IP address and User-Agent.
* JSON payload representing the before/after state delta.

---

## 7. Cloud & Supabase Credential Governance

### 7.1 Separation of Public vs. Secret Keys
When integrating Supabase or external PaaS services:
* **`SUPABASE_SERVICE_ROLE_KEY` is Strictly Forbidden on Client**: The `service_role` key bypasses all Row Level Security and grants unrestricted administrative control over the entire database. It must **never** be included in frontend code, Vite bundles (`VITE_*`), or committed to Git.
* **Prisma Server-Side Exclusivity**: In NEXDESK, database credentials (`DATABASE_URL` and `DIRECT_URL`) reside **only on the Node.js backend runtime** on Render or local `.env`. The client-side React SPA communicates solely over HTTPS with our Express API gateway.
* **Least-Privilege Database Roles**: The database user used by Prisma is restricted to the `public` schema and cannot alter PostgreSQL cluster configuration or access foreign tables.

