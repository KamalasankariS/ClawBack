# Confido — Deduction Recovery Tool

![CI](https://github.com/KamalasankariS/Confido-Deduction-Recovery-Project/actions/workflows/ci.yml/badge.svg)
![Node](https://img.shields.io/badge/node-18%2B-brightgreen)
![TypeScript](https://img.shields.io/badge/typescript-strict-blue)
![License](https://img.shields.io/badge/license-MIT-green)

An internal tool for tracking, triaging, and recovering retailer deductions across companies. Replaces the analyst's spreadsheet with a structured workflow, JWT authentication, mandatory audit trail, file attachments, data quality enforcement, and a recovery-focused dashboard.

## How to Run

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL)

### Quick Start (one command)

```bash
git clone https://github.com/KamalasankariS/Confido-Deduction-Recovery-Project.git
cd Confido-Deduction-Recovery-Project
./start.sh
```

This single script handles everything:
- Checks that Node.js and Docker are installed
- Starts PostgreSQL via Docker Compose
- Installs all dependencies (server + client)
- Runs database migrations
- Seeds 1,000+ deductions (first run only)
- Starts both server and client

Open **http://localhost:5173** when you see "Confido is running!" Press `Ctrl+C` to stop.

### Manual Setup (if you prefer)

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install server dependencies & run migrations
cd server
npm install
npx prisma migrate deploy

# 3. Seed the database (first time only)
npx tsx src/seed/seed.ts

# 4. Start the API server (port 3001)
npm run dev

# 5. In a new terminal — install and start the frontend (port 5173)
cd ../client
npm install
npm run dev
```

### First-Time Setup for Analysts

1. Open `http://localhost:5173` — you'll see the **registration page**
2. Click **"Create an account"** and fill in:
   - **Full Name** — your display name across the app
   - **Employee ID** — unique company ID (e.g., `EMP-001`), auto-uppercased
   - **Work Email** — must be unique, used for login
   - **Password** — must meet all 5 strength requirements (8+ chars, uppercase, lowercase, number, special character)
3. After registering, you're logged in and land on the **Dashboard**
4. Select your **company** from the sidebar dropdown to filter data to your scope
5. Start triaging deductions from the **Deductions** page

Returning analysts just sign in with their email and password.

### Verification

After setup, you should see:
- **1,005 deductions** imported from raw JSON exports
- **Import audit entries** showing every data transformation on the Data Cleanup Report page
- **14 retailers**, **4 companies**, **10 dispute reasons** normalized from messy source data
- Dashboard with recovery metrics, retailer breakdown, and aging charts

## What I Built

### Pages

- **Dashboard** — Recovery-focused metrics: total deductions, amount in dispute, recovered amount, recovery rate. **Clickable metric cards** navigate directly to the relevant filtered deductions. Bar charts for recovery by retailer and aging of open disputes. Pipeline overview showing counts at each workflow stage — each box is also clickable.

- **Deductions List** — Filterable, paginated table of all deductions. **Multi-select status filter** with checkboxes (e.g., filter by "Won" and "Partial" simultaneously). Filter by company and retailer. Search by invoice number. **"Handled By" column** shows which analysts have worked on each deduction. Click any row for the detail view.

- **Deduction Detail** — The main workhorse. Displays amount, company, retailer, reason, invoice, and date. Contextual action buttons change based on current status. **Notes are mandatory** on every action — the button stays disabled until notes are entered. Optional **file attachments** (PDF, images, spreadsheets) can be added to any action. Edit button to fix missing or incorrect data. Full activity timeline showing every action with who, when, notes, and attached files.

- **Data Cleanup Report** — Human-readable transparency page showing every data transformation applied during import. Color-coded summary cards let analysts filter by field type (Retailer, Amount, Date, Status, etc.). Each correction shows a plain-English description of what changed and why, with a visual before → after comparison. Deduction IDs link directly to the detail page.

### Dispute Workflow

```
Open → Accept (legitimate, no dispute needed)
     → Put On Hold (need more info, revisit later)
     → Dispute → File Dispute → Resolve (Won / Lost / Partial) → Close
```

Every state transition is validated server-side and logged with the analyst's name, timestamp, and mandatory notes. On Hold deductions can be taken off hold back to Open. Optional file attachments (supporting documents, invoices, credit memos) can be added to any action.

### Data Entry

Two ways to add new deductions:

1. **Manual entry** — Form with dropdowns for company, retailer, and reason. Every dropdown includes an "Add New" option that lets the analyst create a new entry inline without leaving the form.

2. **CSV upload** — Upload a CSV file. The system parses and validates the data, then shows a **preview table** for the analyst to review before confirming the import. Invoice numbers are auto-normalized. Invalid rows (bad IDs, negative amounts) are caught before import.

### Data Quality Enforcement

The raw spreadsheet data had 54 retailer name variants, 28 reason variants, 7 date formats, mixed amount formats, and 38 status variants. To prevent this from happening again:

- **Dropdown-only entry** — Company, retailer, and reason are always selected from controlled dropdowns (not free text). New values are created through a structured "Add New" flow.

- **Invoice normalization** — Invoice numbers are automatically uppercased and stripped of invalid characters (only A-Z, 0-9, hyphens allowed). Enforced both client-side and server-side.

- **Amount validation** — Negative amounts are rejected. Values are rounded to 2 decimal places.

- **Duplicate detection** — Before creating a deduction, the system checks for existing records with the same retailer, invoice, amount, and date. If matches are found, the analyst sees a warning with details and can choose to proceed or cancel.

- **CSV preview** — Uploaded CSV data is validated and shown in a preview table before import. Catches unknown IDs, bad amounts, and missing dates before any data enters the system.

### Data Cleaning (Import)

The seed script processes 1,000+ raw records with six cleaner modules:

| Cleaner | What it does |
|---------|-------------|
| `retailer.ts` | Maps 54 name variants (KeHE, KEHE, kehe, Kehe Food Distributors...) to 14 canonical retailers |
| `amount.ts` | Parses $, USD prefix, accounting format (102.78), "TBD", scientific notation |
| `date.ts` | Normalizes YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY, text dates, Unix timestamps |
| `status.ts` | Maps 38 variants to 4 canonical statuses |
| `reason.ts` | Maps 28 free-text reasons to 9 canonical codes |
| `deleted.ts` | Normalizes bool/int/string deleted flags to boolean |

Every transformation is logged to the `import_audit` table with the deduction ID, field name, raw value, cleaned value, and rule applied.

## Assumptions

- **JWT authentication** — Analysts register with a unique work email, employee ID, full name, and a strong password. Sessions persist via localStorage with 7-day token expiry. No SSO or OAuth integration.

- **Password policy** — Minimum 8 characters, must include uppercase, lowercase, number, and special character. Enforced on both client and server.

- **Soft-deleted records** (180+) are imported but excluded from all views and metrics by default.

- **Orphan company IDs** (3 and 0 in the raw data, which don't exist in companies.json) are imported with `company_id = null` and flagged in the Data Cleanup Report.

- **Resolution logic** — "Won" = full deduction amount recovered. "Partial" = analyst enters the actual recovered amount. "Lost" = $0 recovered.

- **Recovery rate** = total recovered / total amount that entered the dispute pipeline.

- **Mandatory notes** — Every workflow action (triage, dispute, resolve, close) requires the analyst to enter notes explaining the action. This prevents untraceable decisions.

- **No role-based permissions** — Any authenticated analyst can perform any action on any deduction. The audit trail provides accountability.

## Tradeoffs

| Decision | Why | Alternative considered |
|----------|-----|----------------------|
| **PostgreSQL over SQLite** | Proper SQL types, concurrent access, scales with team growth | SQLite would be simpler (no Docker) but limits concurrent writes and lacks features like `mode: 'insensitive'` |
| **JWT over SSO/OAuth** | Sufficient for internal use, no external identity provider dependency | SSO would be better for enterprise but requires infrastructure setup |
| **Server-side pagination** | Correct pattern that handles dataset growth | Client-side filtering would be simpler for 1,000 records but breaks at 10,000+ |
| **Hardcoded retailer alias map** | Works reliably for the known 54 variants, zero false positives | Fuzzy matching (Levenshtein distance) risks false matches and requires tuning |
| **Controlled dropdowns over free text** | Prevents the data quality mess that created 54 retailer variants in the first place | Free text is more flexible but caused the original problem |
| **Preview before CSV import** | Analyst catches errors before they enter the system | Auto-import is faster but risks bad data |
| **Duplicate warning (not blocking)** | Sometimes legitimate duplicates exist (same retailer, same amount, different invoices) | Hard-blocking would be safer but creates false positives |

## What I'd Improve With More Time

- ~~**Bulk actions** — Triage or close multiple deductions at once from the list view~~ **Done**
- ~~**Export to CSV** — Download filtered results for reporting or sharing~~ **Done**
- **Email/Slack alerts** — Notify when disputes hit aging thresholds (30, 60, 90 days)
- **Trend charts** — Recovery rate over time, dispute volume by month
- **Role-based access control** — Different permission levels (analyst, manager, admin) per company
- **SSO/OAuth integration** — Enterprise single sign-on with Google Workspace, Okta, etc.
- **Automated dispute suggestions** — Flag deductions where the reason is typically disputable and the amount exceeds a configurable threshold

## Quality & Security

- **100 automated tests** — Unit tests (data cleaners, workflow state machine) and integration tests (auth API, deductions CRUD, full workflow pipeline) via Vitest + Supertest
- **CI/CD** — GitHub Actions pipeline with 4 jobs: server type check, client lint + type check, client build, server tests with PostgreSQL service container
- **Security headers** — Helmet middleware for XSS protection, HSTS, content-type sniffing prevention
- **Rate limiting** — 100 requests/minute general, 10 requests/minute on auth endpoints
- **Error boundary** — Graceful fallback UI if a page crashes
- **Responsive design** — Works on desktop, tablet, and mobile (collapsible sidebar, scrollable tables)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 16 (via Docker Compose) |
| **Auth** | JWT (jsonwebtoken), bcryptjs |
| **Security** | Helmet, express-rate-limit |
| **Testing** | Vitest, Supertest (100 tests) |
| **CI/CD** | GitHub Actions (4 jobs) |
| **File Uploads** | Multer (10MB limit, stored locally) |
| **Frontend** | React, TypeScript, Vite, Tailwind CSS v4 |
| **Charts** | Recharts |
| **Icons** | Lucide React |

## Project Structure

```
confido/
├── docker-compose.yml          # PostgreSQL container
├── start.sh                    # One-command startup script
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── seed/                       # Raw JSON data files
├── server/
│   ├── prisma/schema.prisma    # Database schema (7 tables)
│   ├── vitest.config.ts        # Test configuration
│   └── src/
│       ├── app.ts              # Express app (extracted for testing)
│       ├── index.ts             # Server entry point
│       ├── lib/                # Prisma client, workflow state machine
│       ├── middleware/         # JWT auth, error handler
│       ├── routes/             # API endpoints (auth, deductions, dashboard, etc.)
│       ├── __tests__/          # 100 automated tests
│       ├── uploads/            # Uploaded supporting documents
│       └── seed/               # Data cleaning modules
└── client/
    └── src/
        ├── api/                # Typed fetch wrapper
        ├── components/         # Toast, ErrorBoundary, SelectWithAdd, AppShell
        ├── hooks/              # useTitle
        ├── pages/              # Auth, Dashboard, Deductions, Detail, Data Cleanup Report
        └── lib/                # Utils, constants
```
