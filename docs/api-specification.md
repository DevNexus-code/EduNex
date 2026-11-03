# NEXDESK — Enterprise IT Service Management & Asset Intelligence Platform
## RESTful API Specification (v1)

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Phase:** 1 — Architecture & Specifications  
**Author:** AI Project Orchestrator & Senior Software Architect  

---

## 1. Global API Conventions

### 1.1 Base URL & Versioning
All API endpoints are mounted under the `/api/v1` path prefix. Breaking changes necessitate a path version bump (e.g., `/api/v2`).

### 1.2 Request & Response Formats
* **Content-Type**: Requests with payloads must specify `Content-Type: application/json`.
* **Standard Response Envelope**: Successful queries return data inside a structured JSON payload:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "page": 1,
      "limit": 20,
      "totalItems": 142,
      "totalPages": 8
    }
  }
  ```
* **Error Response Format (RFC 7807 Problem Details)**:
  ```json
  {
    "type": "https://api.nexdesk.internal/errors/forbidden",
    "title": "Forbidden",
    "status": 403,
    "detail": "You do not have the required role permissions to perform this operation.",
    "instance": "/api/v1/tickets/b91f8e12-4cf3-481e-923f-b883017a4c4a",
    "requestId": "018d9f10-7b24-7100-84a1-5231ef6b1c40"
  }
  ```

### 1.3 Standard HTTP Status Codes
* `200 OK`: Successful read or update.
* `201 Created`: Resource successfully created (with `Location` header).
* `204 No Content`: Successful deletion or state change with no returned body.
* `400 Bad Request`: Malformed JSON or invalid query parameter types.
* `401 Unauthorized`: Missing or invalid session cookie.
* `403 Forbidden`: Authenticated, but lacking role privileges.
* `404 Not Found`: Target resource does not exist.
* `409 Conflict`: Business rule violation (e.g., duplicate asset tag, license capacity reached).
* `422 Unprocessable Entity`: Schema validation failure (Zod error details included).
* `429 Too Many Requests`: Rate limit exceeded.
* `500 Internal Server Error`: Unhandled server exception.

---

## 2. Authentication & Session Endpoints (`/api/v1/auth`)

### 2.1 Authenticate / Login
* **Method**: `POST`
* **Path**: `/api/v1/auth/login`
* **Access**: Public (Subject to strict rate limiting: max 5 attempts/min per IP)
* **Request Body**:
  ```json
  {
    "email": "agent.smith@nexdesk.internal",
    "password": "SecurePassword123!"
  }
  ```
* **Response Headers**:
  `Set-Cookie: nexdesk_session=s%3A...; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "c89f1d0a-9938-4e89-b003-88da12bc3456",
        "email": "agent.smith@nexdesk.internal",
        "firstName": "Agent",
        "lastName": "Smith",
        "role": "IT_AGENT",
        "department": { "id": "uuid", "name": "IT Infrastructure", "code": "IT" }
      }
    }
  }
  ```

### 2.2 Terminate Session / Logout
* **Method**: `POST`
* **Path**: `/api/v1/auth/logout`
* **Access**: Authenticated (Any role)
* **Response Body (`200 OK`)**:
  `Set-Cookie: nexdesk_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ```json
  { "success": true, "message": "Session terminated successfully." }
  ```

### 2.3 Current Session Profile
* **Method**: `GET`
* **Path**: `/api/v1/auth/me`
* **Access**: Authenticated (Any role)
* **Response Body (`200 OK`)**: Returns current user object and active role permissions.

---

## 3. Incident & Ticket Endpoints (`/api/v1/tickets`)

### 3.1 List / Search Tickets
* **Method**: `GET`
* **Path**: `/api/v1/tickets`
* **Access**: Authenticated.
  * `EMPLOYEE`: Automatically scoped to `creator_id = current_user.id`.
  * `IT_AGENT`, `TEAM_LEAD`, `ADMIN`: Access to full organization queue.
* **Query Parameters**:
  * `page` (default 1), `limit` (default 20, max 100)
  * `status`: Filter by status (`NEW`, `ASSIGNED`, `IN_PROGRESS`, etc.)
  * `priority`: Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  * `category`: Filter by category (`HARDWARE`, `SOFTWARE`, etc.)
  * `assigneeId`: Filter by assigned agent UUID
  * `search`: Full-text search across `title`, `description`, `ticketNumber`
* **Response Body (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "e4b2d1c0-4f5a-4712-921d-91a7c502b412",
        "ticketNumber": "TSK-10024",
        "title": "MacBook displays kernel panic on wake",
        "category": "HARDWARE",
        "priority": "HIGH",
        "status": "IN_PROGRESS",
        "slaDueAt": "2026-10-25T14:00:00.000Z",
        "creator": { "id": "uuid", "name": "Jane Doe", "email": "jane@nexdesk.internal" },
        "assignee": { "id": "uuid", "name": "Agent Smith" },
        "asset": { "id": "uuid", "assetTag": "AST-00512", "name": "MacBook Pro 16\"" },
        "createdAt": "2026-10-24T18:00:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
  }
  ```

### 3.2 Create Ticket
* **Method**: `POST`
* **Path**: `/api/v1/tickets`
* **Access**: Authenticated (Any role)
* **Request Body**:
  ```json
  {
    "title": "VPN connection drops every 10 minutes",
    "description": "Connecting via OpenVPN client results in TLS handshake timeouts after 10m.",
    "category": "NETWORK",
    "priority": "MEDIUM",
    "assetId": "5c9d1a20-3b4e-4f67-8910-123456789abc"
  }
  ```
* **Response Body (`201 Created`)**: Returns created ticket entity with generated `ticketNumber` and calculated `slaDueAt`.

### 3.3 Retrieve Ticket Details
* **Method**: `GET`
* **Path**: `/api/v1/tickets/:id`
* **Access**: Authenticated. (Employees can only view tickets they created).
* **Response Body (`200 OK`)**: Full ticket object including linked asset, public comments (and internal work notes if role >= `IT_AGENT`).

### 3.4 Update Ticket (Status, Assignment, Priority)
* **Method**: `PATCH`
* **Path**: `/api/v1/tickets/:id`
* **Access**: `IT_AGENT`, `TEAM_LEAD`, `ADMIN`
* **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "assigneeId": "c89f1d0a-9938-4e89-b003-88da12bc3456"
  }
  ```
* **Response Body (`200 OK`)**: Updated ticket object; records history entry.

### 3.5 Add Comment to Ticket
* **Method**: `POST`
* **Path**: `/api/v1/tickets/:id/comments`
* **Access**: Authenticated.
  * Note: Setting `"isInternal": true` requires role `IT_AGENT`, `TEAM_LEAD`, or `ADMIN`.
* **Request Body**:
  ```json
  {
    "content": "Replaced USB-C adapter cable; problem resolved.",
    "isInternal": false
  }
  ```
* **Response Body (`201 Created`)**: Comment entity.

---

## 4. IT Asset Management Endpoints (`/api/v1/assets`)

### 4.1 List Assets
* **Method**: `GET`
* **Path**: `/api/v1/assets`
* **Access**: `IT_AGENT`, `TEAM_LEAD`, `ADMIN` (Employees use `/api/v1/assets/my-assets`)
* **Query Parameters**: `status`, `category`, `search`, `page`, `limit`

### 4.2 Create Asset
* **Method**: `POST`
* **Path**: `/api/v1/assets`
* **Access**: `IT_AGENT`, `TEAM_LEAD`, `ADMIN`
* **Request Body**:
  ```json
  {
    "assetTag": "AST-00842",
    "serialNumber": "C02G8490MD6T",
    "name": "Dell UltraSharp 27\" 4K",
    "category": "MONITOR",
    "model": "U2723QE",
    "manufacturer": "Dell",
    "purchaseDate": "2026-09-15",
    "purchaseCost": 580.00,
    "warrantyExpiresAt": "2029-09-15"
  }
  ```

### 4.3 Assign Asset to Employee
* **Method**: `POST`
* **Path**: `/api/v1/assets/:id/assign`
* **Access**: `IT_AGENT`, `TEAM_LEAD`, `ADMIN`
* **Request Body**:
  ```json
  {
    "userId": "d71e2c90-1122-3344-5566-778899aabbcc",
    "notes": "Issued during onboarding; includes power brick and USB-C cable."
  }
  ```

### 4.4 Return Asset to Inventory
* **Method**: `POST`
* **Path**: `/api/v1/assets/:id/return`
* **Access**: `IT_AGENT`, `TEAM_LEAD`, `ADMIN`
* **Request Body**:
  ```json
  {
    "condition": "EXCELLENT",
    "notes": "Device wiped and placed into stock shelf B-12."
  }
  ```

---

## 5. Reporting & Dashboards (`/api/v1/dashboard`)

### 5.1 Role-Scoped Dashboard Metrics
* **Method**: `GET`
* **Path**: `/api/v1/dashboard/metrics`
* **Access**: Authenticated (Dynamically returns metrics tailored to caller's role)
* **Response Body (`200 OK`)**:
  * For `IT_AGENT`: Open ticket count, tickets approaching SLA breach (<1h), tickets assigned to me.
  * For `TEAM_LEAD` / `ADMIN`: SLA compliance percentage (last 30d), average resolution time (MTTR), assets in repair, total unassigned tickets.
  * For `EMPLOYEE`: Active open tickets, assigned assets count.

---

## 6. Audit Logs (`/api/v1/audit-logs`)

### 6.1 Query System Audit Trail
* **Method**: `GET`
* **Path**: `/api/v1/audit-logs`
* **Access**: `ADMIN` only
* **Query Parameters**: `startDate`, `endDate`, `entityType`, `actorId`, `page`, `limit`
* **Response Body (`200 OK`)**: Paginated audit log records.

---

## 7. System Health (`/api/v1/health`)

### 7.1 Liveness & Readiness Probe
* **Method**: `GET`
* **Path**: `/api/v1/health`
* **Access**: Public
* **Response Body (`200 OK`)**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-24T22:15:00.000Z",
    "uptimeSeconds": 1420.5,
    "checks": {
      "database": "connected"
    }
  }
  ```
