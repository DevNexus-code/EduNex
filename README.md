# EDUNEX — Student & Staff Management System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg)](https://supabase.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)](https://www.prisma.io/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFA611.svg)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **"Smart Academic Administration & Campus Management Platform."**  
> EDUNEX is an enterprise-grade full-stack Student and Staff Management System engineered for modern schools, colleges, universities, and academic institutions.

---

## 🎯 Executive Overview

Academic administration requires rigorous synchronization across admissions, faculty assignments, daily attendance registers, fee reconciliations, examination grading, weekly timetable scheduling, and institutional compliance.

**EDUNEX** replaces fragmented spreadsheets and legacy portals with an integrated, secure, and modern academic operations platform featuring:

- **Complete Student Lifecycle Management**: End-to-end admissions, enrollment tracking, parent/guardian records, fee balances, and attendance ratios.
- **Faculty & Staff Governance**: Teaching and non-teaching personnel records, department assignments, designations, and leave tracking.
- **Curriculum & Academic Structure**: Hierarchical management of Departments, Degree Courses, Syllabus Subjects, Academic Sessions, and Classroom Sections.
- **Attendance Registry**: Daily student batch registers with rapid-fill shortcuts and monthly aggregation reports, alongside staff check-in/out tracking.
- **Fees & Payment Receipts**: Course fee structures, student payment ledgers, real-time balance calculations, and official printable receipts.
- **Examinations & Automatic Grading**: Exam schedules, subject test papers, marks entry with automated grade calculations (A+ to F), and published results.
- **Weekly Timetable Matrix**: Monday–Saturday period scheduling with teacher and room conflict detection.
- **Institutional Governance**: Role-based access control (RBAC), security audit trails, document repository, and one-click sanitized CSV exports.

---

## 🏗️ System Architecture

EDUNEX is built on a high-performance, type-safe full-stack TypeScript architecture:

```mermaid
graph TD
    subgraph Client["Frontend Client (React 18 + Vite + Tailwind CSS)"]
        UI["Academic Dashboard & Administration Views"]
        AuthCtx["Auth Context (Firebase Client SDK)"]
        ApiClient["Type-Safe REST Client"]
    end

    subgraph Server["Backend Server (Node.js + Express + TypeScript)"]
        AuthMiddleware["JWT & Role Authorization Guard"]
        Modules["16 Academic Domain Modules"]
        PrismaORM["Prisma Client ORM"]
    end

    subgraph DataServices["Cloud Data Services"]
        Supabase["Supabase PostgreSQL (14 Relational Models)"]
        FirebaseAuth["Firebase Authentication (Email & Google OAuth)"]
    end

    UI --> AuthCtx
    UI --> ApiClient
    ApiClient -- "HTTPS /api/v1/*" --> AuthMiddleware
    AuthMiddleware --> Modules
    Modules --> PrismaORM
    PrismaORM --> Supabase
    AuthCtx <--> FirebaseAuth
    AuthMiddleware <--> FirebaseAuth
```

### Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript 5.7, Vite, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Express 4.21, TypeScript, Prisma ORM 6.x |
| **Database** | PostgreSQL hosted on Supabase (14 interconnected relational models) |
| **Authentication** | Firebase Authentication (Email/Password & Google OAuth) synced to Supabase |
| **Zero-Cost Design**| Runs on free-tier Supabase PostgreSQL and Firebase Auth with deterministic local execution |

---

## 👥 Role-Based Access Control (RBAC)

EDUNEX implements a 7-tier hierarchical role permission model:

| Role | Permissions & Responsibilities |
| :--- | :--- |
| `SUPER_ADMIN` | Unrestricted institutional access, user creation, account governance, audit logs, system configuration. |
| `ADMIN` | Academic operations, student admissions, staff onboarding, fee recording, timetable scheduling, reports. |
| `PRINCIPAL` | High-level academic oversight, staff leave approvals, exam publishing, performance analytics. |
| `TEACHER` | Classroom attendance marking, examination marks entry, timetable inspection, student queries. |
| `STAFF` | Department administrative tasks, document management, personal leave requests, self-service profile. |
| `STUDENT` | View enrolled courses, subjects, daily attendance percentage, fee dues, exam grades, timetable. |
| `PARENT` | View ward's attendance records, fee payment history, academic report cards, institutional notices. |

---

## 📱 Application Modules & Workspaces

### 1. Academic Dashboard (`/dashboard`)
Command center presenting high-level institutional KPIs: total and active student enrollments, faculty counts, attendance turnout percentage, total fee collections, recent admissions ledger, upcoming examination schedules, and campus notices.

### 2. Student Directory & Admissions (`/students`)
Comprehensive directory supporting keyword search, course and status filtering. Includes modal for registering new student admissions with automatic generation of Enrollment IDs (`STU-YYYY-XXXX`) and Admission Numbers (`ADM-YYYY-XXXX`), guardian contacts, address details, and sliding detail drawers.

### 3. Faculty & Staff Management (`/staff`)
Directory for teaching and non-teaching staff members, categorized by employment type (`FULL_TIME`, `PART_TIME`, `CONTRACT`), department assignments, qualifications, contact information, and automated Staff IDs (`STF-YYYY-XXXX`).

### 4. Academic Structure & Curriculum (`/academics`)
Tabbed administration workspace for:
- **Departments**: Codes, descriptions, Head of Department (HOD), contact channels.
- **Courses**: Undergraduate, Postgraduate, Diploma, and Certificate courses with duration and semester configurations.
- **Subjects**: Syllabus course mappings, semester levels, credit allocations, core vs. elective classifications.
- **Academic Sessions & Sections**: Cohort years, semester class sections with classroom capacities.

### 5. Attendance Operations (`/attendance`)
- **Daily Batch Register**: Fast attendance marking by course and section with single-click bulk shortcuts ("All Present", "All Absent"), individual toggles (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`), and remarks.
- **Staff Attendance**: Daily sign-in records with check-in and check-out timestamps.
- **Monthly Summary**: Departmental and section-level turnout percentages.

### 6. Fees & Billing Management (`/fees`)
- **Student Balance Ledger**: Live reconciliation of total assigned course fees, payments made, and remaining dues.
- **Payment Collection Modal**: Record cash, cheque, bank transfer, or online payments.
- **Official Printable Receipts**: Formatted institutional payment receipts (`RCP-YYYY-XXXX`) complete with transaction details, student metadata, cashier notes, and browser print triggers.

### 7. Examinations & Grading (`/examinations`)
- **Exam Scheduling**: Create institutional examinations linked to academic sessions.
- **Subject Papers**: Add individual subject papers with test dates, maximum marks, passing marks, and exam hall numbers.
- **Marks Entry & Auto-Grading**: Input student scores with instantaneous automated grade evaluations:
  - `A+` (90%+)
  - `A` (80%–89%)
  - `B` (70%–79%)
  - `C` (60%–69%)
  - `D` (40%–59%)
  - `F` (<40%, Fail)
- **Results Summary**: Published grades and pass/fail indicators.

### 8. Weekly Timetable Matrix (`/timetable`)
Interactive visual schedule matrix covering Monday through Saturday. Allows scheduling class periods with subject, assigned teacher, start time, end time, and room number, backed by backend conflict detection to prevent double-booking.

### 9. Staff Leave Management (`/leaves`)
Staff members can submit leave requests specifying leave type (`CASUAL`, `SICK`, `ANNUAL`, `MATERNITY`, `PATERNITY`, `BEREAVEMENT`, `UNPAID`), date ranges, and reasons. Administrators and Principals can review, approve, or reject requests with administrative remarks.

### 10. Campus Notice Board (`/announcements`)
Institutional broadcasting system supporting targeted audience scoping (`ALL`, `STUDENTS`, `TEACHERS`, `STAFF`, `PARENTS`), priority badges (`URGENT`, `HIGH`, `NORMAL`, `LOW`), publish dates, and expiration scheduling.

### 11. Document Repository (`/documents`)
Centralized metadata archive for institutional paperwork (`ADMISSION_FORM`, `TRANSCRIPT`, `ID_PROOF`, `TRANSFER_CERTIFICATE`, `MEDICAL_RECORD`, `CONTRACT`, `OTHER`) linked to students or staff members.

### 12. Academic Analytics & Reports (`/reports`)
Institutional metrics summary and sanitized, one-click CSV export endpoints:
- Student Enrollment Directory CSV
- Faculty & Staff Directory CSV
- Attendance Turnout Ledger CSV
- Fee Collections & Receipts CSV
- Examination Marks & Results CSV

### 13. System Audit Trail (`/audit-logs`)
Non-repudiable audit logging recording every sensitive administrative action, capturing actor ID, actor email, action type, IP address, timestamp, and metadata diffs in an interactive modal viewer.

### 14. User Governance (`/users`)
Enterprise account governance available to Super Admins and Admins:
- Provision new system accounts with assigned institutional roles and linked staff/student profiles.
- One-click account activation / deactivation switches.
- Temporary credentials generation and password reset link issuance.

### 15. Self-Service Profile (`/profile`)
Personal user hub to inspect profile information, update contact numbers and bio, manage avatars, and trigger secure Firebase password reset emails.

---

## 🔒 Enterprise Authentication & Security

- **Sign-In-Only Public Login (`/login`)**: No public registration form exists. Users cannot self-register an account.
- **Admin-Only Account Provisioning**: Accounts are provisioned exclusively by administrators through the User Governance portal.
- **Pre-Registration Google OAuth**: Google Sign-In is strictly guarded. When an unprovisioned Google account attempts to sign in, the system safely rejects the attempt with the explicit message:  
  `"Your account is not registered with EDUNEX. Please contact your academic administrator."`
- **Zero Plaintext Passwords**: Passwords and OAuth tokens are handled exclusively by Firebase Authentication. Supabase PostgreSQL stores user metadata, roles, and profiles using the unique Firebase UID.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Active Supabase project
- **Firebase**: Active Firebase project with Email/Password and Google OAuth enabled

### 1. Clone & Install Dependencies

```bash
git clone <repository-url> edunex
cd edunex
npm install
```

### 2. Environment Configuration

#### Backend (`server/.env`)

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
JWT_SECRET="your-super-secret-jwt-key"
```

#### Frontend (`client/.env.local`)

```env
VITE_API_URL="/api/v1"
VITE_FIREBASE_API_KEY="your-firebase-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-app.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### 3. Database Schema Setup

Push the EDUNEX relational schema to your connected Supabase PostgreSQL database:

```bash
npm run db:push
```

### 4. Bootstrap Default Super Admin

Seed the database with an initial Super Admin account:

```bash
npm run bootstrap
```

Default credentials:
- **Email**: `admin@edunex.edu`
- **Password**: `Edunex@Admin2026`
- **Role**: `SUPER_ADMIN`

*(Change this password immediately upon first login via the `/profile` page).*

### 5. Run the Application

Start both the backend API server and frontend client concurrently:

```bash
npm run dev
```

- **Client**: `http://localhost:5173`
- **Server API**: `http://localhost:5000`

---

## 🛠️ Monorepo Scripts Reference

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs client and server concurrently with live reload. |
| `npm run build` | Compiles server TypeScript and creates optimized client Vite production bundle. |
| `npm run lint` | Runs TypeScript compilation verification (`tsc --noEmit`) across all workspaces. |
| `npm run db:push` | Pushes the Prisma schema to Supabase PostgreSQL without data loss. |
| `npm run db:generate`| Generates the isolated Prisma client (`server/src/common/db/generated/client`). |
| `npm run bootstrap` | Seeds initial Super Admin credentials and default academic departments. |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
