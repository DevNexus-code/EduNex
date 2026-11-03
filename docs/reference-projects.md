# NEXDESK — Open-Source Reference Projects & Industry Analysis

**Document Version:** 1.0.0  
**Status:** Approved Reference  
**Author:** AI Project Orchestrator & Principal Architect  

---

## 1. Statement of Independent Development

> **IMPORTANT DECLARATION**:  
> **NEXDESK** is an original, independently architected, and independently developed software system.  
> It does not copy, incorporate, or redistribute proprietary or copyrighted source code, stylesheets, or database structures from any third-party product.  
> The projects examined below serve solely as architectural and functional reference points to evaluate real-world enterprise user flows, ITIL standards, and IT service management (ITSM) conventions.

---

## 2. Comparative Analysis of Reference Projects

### 2.1 GLPI (Gestionnaire Libre de Parc Informatique)
* **GitHub Repository**: [https://github.com/glpi-project/glpi](https://github.com/glpi-project/glpi)
* **Official Website**: [https://www.glpi-project.org/](https://www.glpi-project.org/)
* **Demo Information**: Detailed in the project repository and official website.
* **Technology Stack**: PHP, MySQL/MariaDB, JavaScript.
* **Primary Scope & Major Features**:
  * Extensive ITIL-aligned service desk (Incident, Problem, and Change Management).
  * Comprehensive physical asset discovery and network topology tracking.
  * Multi-tier ticket queues, business rules engine, and contract/financial management.
* **Inspiration for NEXDESK**:
  * Dual-tier comment privacy (public requester updates vs. private IT technician work notes).
  * Explicit ticket status transitions (`NEW` ➔ `ASSIGNED` ➔ `IN_PROGRESS` ➔ `PENDING` ➔ `RESOLVED` ➔ `CLOSED`).
* **NEXDESK Differentiation**:
  * GLPI carries decades of legacy monolithic PHP/MySQL architecture with steep setup complexity.
  * NEXDESK provides a modern, lightweight, type-safe **TypeScript Modular Monolith** (Node.js + React + Prisma) with a fast, responsive user interface and zero-cost cloud deployment.

---

### 2.2 Snipe-IT
* **GitHub Repository**: [https://github.com/grokability/snipe-it](https://github.com/grokability/snipe-it)
* **Official Website & Live Demo**: [https://snipeitapp.com/demo/](https://snipeitapp.com/demo/)
* **Technology Stack**: PHP 8 (Laravel 12), MySQL/MariaDB, Blade/Vue.
* **Primary Scope & Major Features**:
  * Gold standard in open-source IT Asset Management (ITAM).
  * Barcode and QR code asset tracking, warranty expiration monitors, maintenance logs.
  * Check-out/check-in workflows transferring equipment custody to employees.
  * Software license seat pool tracking (purchased seats vs. allocated seats).
* **Inspiration for NEXDESK**:
  * The asset custody ledger pattern: tracking who issued the equipment, when it was returned, and its condition at return.
  * License allocation logic preventing over-allocation past the purchased seat pool limit.
* **NEXDESK Differentiation**:
  * Snipe-IT is primarily focused on inventory and asset management, lacking deep native incident ticketing and SLA countdown engines.
  * NEXDESK natively fuses the **incident lifecycle** and the **asset lifecycle** together—when an incident is filed, the employee's assigned workstation and peripherals are automatically linked.

---

### 2.3 FreeITSM
* **GitHub Repository**: [https://github.com/edmozley/freeitsm](https://github.com/edmozley/freeitsm)
* **Official Website**: [https://freeitsm.co.uk/](https://freeitsm.co.uk/)
* **Primary Scope & Major Features**:
  * Open-source IT service management solution geared toward smaller IT support teams.
  * Core ticket logging, basic SLA targets, and user self-service portals.
* **Inspiration for NEXDESK**:
  * Straightforward role segregation between end-users and support agents.
* **NEXDESK Differentiation**:
  * NEXDESK implements a modern responsive SPA architecture with real-time state caching (TanStack Query), comprehensive audit logs, and strict RFC 7807 problem details error handling.

---

### 2.4 Tick
* **GitHub Repository**: [https://github.com/tick0001/tick](https://github.com/tick0001/tick)
* **Primary Scope & Major Features**:
  * Lightweight, open-source ticketing reference demonstrating fundamental queue handling.
* **Inspiration for NEXDESK**:
  * Simplicity in ticket creation, priority triage, and assignment workflows.

---

## 3. Summary of Key UX & Architecture Patterns Adopted in NEXDESK

1. **Integrated Asset Context in Incident Tickets**: From reviewing GLPI and Snipe-IT, the most common operational friction point is agents asking "What laptop model do you have?" NEXDESK eliminates this by allowing users to pick from their assigned assets when submitting a ticket.
2. **Deterministic SLA Priority Matrix**: Clear time-to-resolution deadlines (`URGENT`: 4h, `HIGH`: 8h, `MEDIUM`: 24h, `LOW`: 72h) with visual urgency indicators.
3. **Immutable Custody Trail**: Every asset assignment or return event records the actor, recipient, date, and condition, establishing accountability for enterprise hardware.
4. **Accessible Enterprise UI**: High-contrast, keyboard-navigable tables, clear role-aware dashboards, and loading/empty states designed for high-throughput daily operations.
