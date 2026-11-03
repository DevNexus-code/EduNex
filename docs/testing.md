# NEXDESK — Enterprise IT Service Management & Asset Intelligence Platform
## Testing Strategy & Quality Assurance Plan

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Phase:** 1 — Architecture & Specifications  
**Author:** AI Project Orchestrator & Senior QA Engineer  

---

## 1. Testing Philosophy & Pyramid

NEXDESK implements a rigorous multi-tier testing strategy ensuring that every layer of the modular monolith—from pure utility functions and business domain services to full browser user journeys—is validated against real enterprise criteria.

```
                  /\
                 /  \
                / E2E\           Playwright (Critical User Journeys & A11y)
               /------\
              /  API   \         Supertest + Vitest (HTTP Status, Headers, Zod, RBAC)
             /----------\
            / Unit / Svc \       Vitest (Domain Rules, SLA Math, Redaction, Auth)
           /--------------\
```

---

## 2. Test Stack & Categories

### 2.1 Unit Tests (Vitest)
* **Scope**: Isolated domain functions, SLA calculation algorithms, password hashing helpers, Zod validation schemas, and logging redaction transformers.
* **Runner**: **Vitest** (Native ESM and TypeScript execution; near-instant execution).
* **Location**: Colocated alongside source files with `.test.ts` or `.spec.ts` extensions.

### 2.2 API Integration Tests (Supertest + Vitest)
* **Scope**: Full Express HTTP request/response pipeline testing. Validates:
  * Routing and HTTP status codes (`200`, `201`, `401`, `403`, `422`).
  * Middleware execution (Helmet security headers, CORS origin verification, `X-Request-ID` correlation).
  * Cookie handling (`Set-Cookie` attributes: `HttpOnly`, `SameSite=Lax`, `Secure`).
  * RFC 7807 problem details payloads on validation failures.
  * Server-side RBAC boundary enforcement (confirming `EMPLOYEE` cannot mutate queue tickets).
* **Runner**: Vitest driving `supertest` against the Express `createApp()` instance without binding to external network ports.

### 2.3 End-to-End (E2E) Browser Tests (Playwright)
* **Scope**: Simulates real human workflows across the browser:
  * **Employee Journey**: Login ➔ View dashboard ➔ Create incident with linked laptop ➔ Post follow-up comment.
  * **IT Agent Journey**: Login ➔ Triage queue ➔ Claim incident ➔ Add internal work note ➔ Transition status to `IN_PROGRESS` ➔ Resolve.
  * **Asset Lifecycle**: IT Agent navigates to Asset Inventory ➔ Checks out asset to employee ➔ Verifies custody history entry ➔ Checks back into stock.
* **Accessibility (A11y)**: Automated WCAG 2.1 Level AA conformance scans using `@axe-core/playwright`.
* **Viewport Testing**: Automated verification across Desktop (1280x800), Tablet (768x1024), and Mobile (375x667).

---

## 3. Security-Focused Test Cases

Security tests are treated as first-class citizens and must pass before any code is approved for merge:

```typescript
// Sample Security Test Suite Specification
describe('Security & Authorization Boundary Enforcement', () => {
  it('rejects unauthenticated requests to protected endpoints with 401', async () => {
    const res = await request(app).get('/api/v1/tickets');
    expect(res.status).toBe(401);
    expect(res.body.title).toBe('Unauthorized');
  });

  it('rejects employee access to agent queue with 403 Forbidden', async () => {
    const employeeSession = await loginAs('EMPLOYEE');
    const res = await request(app)
      .get('/api/v1/tickets?scope=all')
      .set('Cookie', employeeSession);
    expect(res.status).toBe(403);
  });

  it('filters out internal agent notes when viewed by an employee', async () => {
    const employeeSession = await loginAs('EMPLOYEE');
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketWithInternalNotesId}`)
      .set('Cookie', employeeSession);
    expect(res.status).toBe(200);
    const comments = res.body.data.comments;
    expect(comments.some((c: any) => c.isInternal)).toBe(false);
  });

  it('enforces rate limiting on repeated failed login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/auth/login').send({ email: 'bad@user.com', password: 'bad' });
    }
    const blockedRes = await request(app).post('/api/v1/auth/login').send({ email: 'bad@user.com', password: 'bad' });
    expect(blockedRes.status).toBe(429);
  });
});
```

---

## 4. Execution Commands (Windows PowerShell)

All test commands can be executed from the repository root:

```powershell
# 1. Run all unit and integration tests across workspaces
npm run test

# 2. Run tests in watch mode during development
npm run test --workspace=server -- --watch

# 3. Run tests with code coverage reporting
npm run test --workspace=server -- --coverage

# 4. Run Playwright End-to-End tests (headed mode)
npx playwright test --headed

# 5. View interactive Playwright test report
npx playwright show-report
```

---

## 5. Continuous Integration (GitHub Actions)

The `.github/workflows/ci.yml` pipeline automatically executes on all Pull Requests and pushes to `main`:

```yaml
name: NEXDESK CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Check TypeScript Compilation
        run: npm run build

      - name: Run Linting Checks
        run: npm run lint

      - name: Run Automated Test Suites
        run: npm run test
```
