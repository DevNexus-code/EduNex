# Architectural Decision Record (ADR)
## ADR 0001: Modular Monolith Architecture

* **Status:** Approved  
* **Date:** 2026-10-24  
* **Decision Makers:** AI Project Orchestrator, Senior Software Architect  
* **Consulted:** Solo Developer / Product Owner  

---

## 1. Context and Problem Statement

NEXDESK is an enterprise IT Service Management (ITSM) and Asset Intelligence Platform combining incident ticketing, SLA tracking, IT asset lifecycle management, role-based authorization, reporting, and audit logging. 

We need an architectural blueprint that balances:
1. **Enterprise-Grade Quality**: Clear separation of concerns, high maintainability, strong security, and testability.
2. **Developer Ergonomics**: A solo developer building and verifying the system end-to-end without spending majority time maintaining distributed infrastructure.
3. **Data Consistency**: Incidents frequently cross-reference physical hardware assets, user assignments, software licenses, and audit histories requiring ACID transaction guarantees.

---

## 2. Alternatives Considered

### Alternative A: Distributed Microservices Architecture
* **Description**: Splitting the system into independent services: `Auth Service`, `Ticket Service`, `Asset Service`, `Audit Service`, and `Reporting Service`, each with its own database and communication via REST/gRPC or message brokers (Kafka/RabbitMQ).
* **Drawbacks**:
  * **Operational Overhead**: Requires managing multiple runtime containers, service discovery, distributed tracing, and complex CI/CD pipelines.
  * **Distributed Data Consistency**: Linking a ticket to an asset or logging an asset transfer requires distributed transactions (Saga pattern or 2-Phase Commit), introducing eventual consistency bugs and failure states.
  * **Overkill for Team Size**: High operational friction for a solo developer that distracts from core product features and security fundamentals.

### Alternative B: Unstructured Traditional Monolith
* **Description**: A single Express application where controllers, models, and routes are grouped by technical layer rather than business domain, allowing any controller to query any database table directly.
* **Drawbacks**:
  * **Spaghetti Code**: Inevitably leads to high coupling, circular dependencies, and tangled business logic.
  * **Refactoring Friction**: Modifying asset logic risks inadvertently breaking ticket resolution workflows.

---

## 3. Decision Outcome

**Chosen Option: Modular Monolith**

NEXDESK will be built as a **Modular Monolith** housed within a clean monorepo (`client/`, `server/`, `shared/`):
* **Single Deployment Unit**: Deployed as a single unified service backed by a single PostgreSQL database.
* **Domain Modules**: Business logic is strictly segregated into self-contained modules (`auth`, `users`, `tickets`, `assets`, `audit`, `reporting`).
* **Strict Boundary Encapsulation**: A module exposes only its public service interface and router. Direct database coupling between disparate domain tables is discouraged in favor of service calls and domain events.
* **Atomic Transactions**: Database operations across aggregates (e.g. creating an incident while updating device state) leverage standard PostgreSQL ACID transactions via Prisma.

---

## 4. Consequences and Trade-Offs

### Positive Consequences
* **Rapid Velocity & Simplicity**: A single `npm run dev` boots the entire stack. Fast feedback loops during local development.
* **Shared Type Safety**: Full end-to-end TypeScript types shared across backend validation, Prisma models, and React UI.
* **Robust Testing**: Seamless integration tests with Supertest and end-to-end tests with Playwright without orchestrating mock microservice networks.
* **Future Extraction Path**: Because boundaries are strictly enforced at the folder and service level, any module (such as the Asset Service or Phase 11 AI Classifier) can be extracted into a standalone microservice in the future with minimal refactoring.

### Negative Consequences & Mitigation
* **Risk of Boundary Degradation**: A developer could accidentally import internal helpers across modules.
  * *Mitigation*: Enforce modular architecture through strict TypeScript project boundaries, linting rules, and code reviews.
