# NEXDESK — Enterprise IT Service Management & Asset Intelligence Platform
## Product Requirements Document (PRD)

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Phase:** 1 — Architecture & Specifications  
**Author:** AI Project Orchestrator & Senior Software Architect  

---

## 1. Executive Summary & Vision

### 1.1 Product Vision
**NEXDESK** is an enterprise-grade IT Service Management (ITSM) and Asset Intelligence Platform engineered for medium-to-large organizations. The platform consolidates everyday incident response, request fulfillment, service-level agreement (SLA) governance, and physical/digital asset tracking into a unified, secure, high-performance web application.

**Tagline:** *From IT Issues to Intelligent Operations.*

### 1.2 Core Objectives
1. **Bridge Service & Asset Silos**: Enable IT agents to immediately correlate an incoming incident with the affected employee's assigned workstation, peripheral, or software license.
2. **Deterministic SLA Governance**: Eliminate missed response deadlines via automated priority calculations, business-hours SLA countdowns, and automated breach notifications.
3. **Role-Enforced Workflows**: Guarantee strict separation of duties between general Employees, IT Agents, Team Leads, and System Administrators at both API and database tiers.
4. **Comprehensive Auditability**: Maintain an immutable, non-repudiable audit log of every state transition, asset reassignment, and security event.
5. **Architectural Excellence**: Provide a resilient, maintainable, modular monolith foundation ready for enterprise deployment and continuous integration.

---

## 2. User Roles & Persona Matrix

NEXDESK enforces four distinct personas across all user journeys:

| Role | Persona Name | Key Responsibilities & Access Scope |
| :--- | :--- | :--- |
| **`EMPLOYEE`** | End-User (Requester) | - Submit incidents and service requests.<br>- View and track own tickets and public comment threads.<br>- View currently assigned hardware assets and software allocations.<br>- Acknowledge equipment handover/returns. |
| **`IT_AGENT`** | First/Second-Line Support | - Triage, claim, reassign, and resolve tickets within their operational queues.<br>- Post internal work notes (hidden from employees) and public replies.<br>- View full hardware and software asset inventories.<br>- Check out, check in, and flag assets for repair or maintenance. |
| **`TEAM_LEAD`** | Support Supervisor | - Supervise agent queues, rebalance workloads, and override ticket priorities.<br>- Monitor real-time SLA breach risks and approve SLA extensions/escalations.<br>- Approve asset disposals, write-offs, or major procurement handovers.<br>- Access operational performance and MTTR (Mean Time to Resolution) dashboards. |
| **`ADMIN`** | System Administrator | - Manage company organizational units (departments, locations).<br>- Create and deactivate user accounts; assign security roles.<br>- Configure system-wide SLA policies, categories, and priority matrices.<br>- Access immutable security audit logs and system diagnostic telemetry. |

---

## 3. Core Product Functional Requirements

### 3.1 Authentication, Session Management & RBAC

#### User Stories & Acceptance Criteria

##### US-AUTH-01: Secure Credential Login
* **As a** user of any role,  
* **I want to** authenticate with my corporate email and password,  
* **So that** I gain authorized access to my designated NEXDESK workspace.

```gherkin
Scenario: Successful Authentication
  Given a registered user with email "agent.smith@nexdesk.internal" and valid password
  When the user submits credentials to "/api/v1/auth/login"
  Then the response status is 200 OK
  And an HTTP-only, SameSite=Lax, Secure session cookie is set
  And the response body contains user profile information (id, name, email, role)
  And a "USER_LOGIN_SUCCESS" audit log event is recorded

Scenario: Failed Authentication
  Given an invalid password or non-existent email
  When the user attempts authentication
  Then the response status is 401 Unauthorized
  And a generic error message "Invalid credentials" is returned
  And a "USER_LOGIN_FAILURE" audit log event is recorded with client IP and user agent
```

##### US-AUTH-02: Server-Side Role Authorization
* **As the** platform security engine,  
* **I want to** validate user permissions on every HTTP request,  
* **So that** unauthorized actors cannot access restricted API endpoints regardless of client-side UI states.

```gherkin
Scenario: Employee Attempts Access to Agent Queue
  Given an authenticated user with role "EMPLOYEE"
  When the user sends a GET request to "/api/v1/tickets?scope=all"
  Then the server returns 403 Forbidden
  And no ticket data from other users is exposed
```

---

### 3.2 Ticket Management & Lifecycle Governance

#### Ticket States
1. `NEW`: Created by employee or agent; unassigned.
2. `ASSIGNED`: Claimed by or assigned to an active IT Agent.
3. `IN_PROGRESS`: Agent actively working on diagnosis or remediation.
4. `PENDING_USER`: Awaiting information, reproduction steps, or confirmation from the employee.
5. `RESOLVED`: Work completed; awaiting automatic closure or employee confirmation.
6. `CLOSED`: Final state. Ticket is archived and locked against further edits.

#### Ticket Priority & SLA Rules
* `URGENT`: Service outage / executive blockage — **1 hour response, 4 hours resolution**.
* `HIGH`: Significant business impact without workaround — **2 hours response, 8 hours resolution**.
* `MEDIUM`: Normal business function degraded with workaround — **4 hours response, 24 hours resolution**.
* `LOW`: Minor request, cosmetic issue, or general question — **8 hours response, 72 hours resolution**.

```
[ NEW ] ──────> [ ASSIGNED ] ──────> [ IN_PROGRESS ] ──────> [ RESOLVED ] ──────> [ CLOSED ]
                   │                     ▲      │                  │
                   │                     │      ▼                  │ (Reopened if issue persists)
                   └─────────────────────┴─> [ PENDING_USER ] ─────┘
```

##### US-TCK-01: Ticket Creation with Asset Linking
* **As an** employee,  
* **I want to** submit a support ticket and optionally select which of my assigned devices is malfunctioning,  
* **So that** the assigned IT agent immediately knows the hardware context.

```gherkin
Scenario: Ticket Created by Employee with Device Context
  Given an authenticated "EMPLOYEE" with assigned laptop "AST-00421"
  When the employee posts a ticket with title "Screen flickering", category "HARDWARE", and assetId for "AST-00421"
  Then the ticket status is initialized to "NEW"
  And the ticketNumber is assigned a sequential human-readable tag (e.g. "TSK-10023")
  And the "slaDueAt" timestamp is automatically calculated based on the priority matrix
  And the assigned asset details are linked to the incident record
```

##### US-TCK-02: Dual-Tier Comments (Public vs. Internal Work Notes)
* **As an** IT Agent,  
* **I want to** write private diagnostic notes that are hidden from the employee,  
* **So that** technical discussions and vendor escalations remain confidential within the IT team.

```gherkin
Scenario: Agent Posts Internal Note
  Given an authenticated "IT_AGENT" viewing ticket "TSK-10023"
  When the agent posts a comment with content "Vendor RMA #9923 issued" and "isInternal = true"
  Then the comment is saved with "isInternal: true"
  And when the employee queries the ticket comments, this comment is completely excluded from the response payload
```

---

### 3.3 IT Asset Management (ITAM)

#### Asset Lifecycle States
* `IN_STOCK`: Inspected, configured, and stored in inventory available for dispatch.
* `ASSIGNED`: Formally handed over and assigned to an employee or department.
* `IN_REPAIR`: Undergoing internal diagnostics or external vendor RMA servicing.
* `RETIRED`: Decommissioned due to age, obsolescence, or total failure.
* `LOST`: Missing or reported stolen; locked down remotely.

##### US-AST-01: Asset Lifecycle & Assignment History
* **As an** IT Agent,  
* **I want to** assign a laptop from inventory to a newly hired employee,  
* **So that** custody is formally transferred and recorded in an immutable historical ledger.

```gherkin
Scenario: Assigning In-Stock Asset to Employee
  Given a laptop "AST-00512" in "IN_STOCK" state
  And an active employee "Jane Doe"
  When the agent calls "/api/v1/assets/AST-00512/assign" with Jane Doe's user ID
  Then the asset status transitions to "ASSIGNED"
  And "assignedToUserId" is set to Jane Doe's ID
  And an "AssetAssignmentHistory" row is inserted recording assetId, userId, assignedById, and assignedAt
  And an audit log entry is written for asset custody change
```

##### US-AST-02: Software License Seat Tracking
* **As a** Team Lead or Admin,  
* **I want to** monitor available software license seats (e.g., JetBrains, Microsoft 365),  
* **So that** our organization never exceeds licensed capacity or incurs non-compliance fines.

```gherkin
Scenario: Prevent License Over-Allocation
  Given a software license "Figma Enterprise" with "totalSeats: 10" and "allocatedSeats: 10"
  When an agent attempts to allocate a seat to user "John Doe"
  Then the server returns 409 Conflict with message "License seat capacity reached"
  And no allocation record is created
```

---

### 3.4 Dashboards & Operational Reporting

* **Employee Dashboard**:
  - Quick summary cards: My Open Incidents, My Closed Tickets, My Assigned Hardware, Allocated Software.
  - Recent activity feed showing public updates on active requests.
* **IT Agent Dashboard**:
  - Global Unassigned Triage Queue.
  - "My Assigned Active Tickets" grouped by urgency and approaching SLA deadline.
  - Quick-action drawer: Claim ticket, Change status, Quick comment.
* **Team Lead / Admin Dashboard**:
  - SLA Compliance Rate percentage over rolling 7-day and 30-day windows.
  - Queue throughput: Tickets opened vs. tickets resolved.
  - Mean Time to Resolution (MTTR) by category and priority.
  - Hardware inventory distribution by status (`IN_STOCK` vs `ASSIGNED` vs `IN_REPAIR`).

---

### 3.5 Security, Error Handling & System Auditability

1. **Non-Repudiation**: Every state mutation (Ticket status change, comment addition, asset handover, user deactivation) records the initiating actor ID, IP address, user agent, and timestamp.
2. **Data Sanitization**: All incoming request bodies undergo strict validation via Zod schemas. Extraneous keys are stripped (`stripUnknown`).
3. **Structured Redaction**: Loggers automatically mask any occurrence of `password`, `token`, `cookie`, or authorization headers.
4. **RFC 7807 Error Responses**: All API errors adhere to standardized problem details containing an error type, human-readable message, status code, and validation field details.

---

## 4. Non-Functional Requirements (NFRs)

| Domain | Standard / Benchmark | Verification Technique |
| :--- | :--- | :--- |
| **Response Latency** | p95 < 150ms for authenticated CRUD operations | Automated API load testing |
| **Security Baseline** | OWASP Top 10 compliance; strict zero-trust server validation | Security audit checklist & automated unit/integration tests |
| **Data Integrity** | Foreign key constraints, ACID transaction wraps on multi-entity updates | Prisma relational constraints & migration integration tests |
| **Code Quality** | TypeScript strict mode enabled across both frontend and backend | `tsc --noEmit` and ESLint checks in CI |
| **UI Accessibility** | WCAG 2.1 Level AA conformance, keyboard navigable, screen-reader semantic HTML | Playwright axe-core accessibility scanner |
| **Responsive Design** | Full desktop (1920x1080), tablet (1024x768), and mobile (375x812) viewports | Automated viewport testing with Playwright |

---

## 5. Scope Boundaries

### In Scope for Initial Phases (Phases 1 – 10)
* Core Modular Monolith structure (Node.js + Express + React + PostgreSQL + Prisma).
* Role-based session authentication with secure HTTP-only cookies.
* Complete Ticket and Asset lifecycle workflows with relational history.
* Role-specific dashboards and SLA tracking.
* Automated testing suites (Unit, Integration, E2E via Playwright).
* Dockerized local development infrastructure and GitHub Actions CI.

### Out of Scope for MVP / Deferred to Phase 11
* Microservices architecture (ADR-0001 dictates modular monolith).
* Third-party SSO providers (Okta, Azure AD / SAML) — planned for post-MVP.
* AI-assisted auto-categorization and smart ticket triage (strictly deferred until Phase 11 after core system passes QA).
* Complex multi-tenant enterprise billing or multi-currency procurement modules.
