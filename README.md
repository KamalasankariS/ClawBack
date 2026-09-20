# ClawBack

**Track, dispute, and recover retailer deductions.**

![CI](https://github.com/KamalasankariS/ClawBack/actions/workflows/ci.yml/badge.svg)

> Retailers deduct millions from CPG payments every year. Many are wrong.
> ClawBack gives your team the workflow to find them, dispute them, and get the money back.

**[Try the Live Demo →](https://clawback-production-4302.up.railway.app)** — no account needed, click "Try the Live Demo" to explore instantly.

---

## Features

- **Dashboard** — Recovery rates, dispute aging, retailer breakdowns, monthly trends
- **Deductions** — Browse, filter, sort, search, add manually, or bulk-import via CSV
- **Triage workflow** — Accept, hold, or dispute each deduction — every action requires a note
- **Dispute pipeline** — File disputes, attach documents, track outcomes (won / partial / lost)
- **Recovery tracking** — Total dollars recovered, broken down by retailer and time period
- **Auto-cleaning** — Upload messy spreadsheets and the system normalizes retailer names, dates, amounts, and statuses automatically
- **Audit log** — Every data correction is logged and reviewable in Tool Maintenance
- **Demo mode** — One-click login to explore the full app with seeded data

---

## Quick Start

You need [Node.js 20+](https://nodejs.org/) and [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/KamalasankariS/Confido-Deduction-Recovery-Project.git
cd Confido-Deduction-Recovery-Project
./start.sh
```

The script starts PostgreSQL, installs dependencies, seeds sample data, and launches the app at **http://localhost:5173**.

Press `Ctrl+C` to stop.

<details>
<summary>Manual setup</summary>

```bash
# 1. Start the database
docker compose up -d

# 2. Set up the server
cd server && npm install && npx prisma db push

# 3. Seed sample data (first time only)
npm run seed

# 4. Start the server (port 3001)
npm run dev

# 5. In a new terminal — start the frontend (port 5173)
cd ../client && npm install && npm run dev
```

</details>

<details>
<summary>Windows users</summary>

Open PowerShell as Administrator and run `wsl --install`, then restart. Use WSL for all commands above.

</details>

---

## How It Works

**Import** → Upload a CSV or add deductions manually. The pipeline normalizes 57 retailer name variants into 14 canonical names, parses 7 date formats, cleans currency/accounting notation, and standardizes 21 status labels into 4 states. Every transformation is logged.

**Triage** → Review each deduction. Accept it, hold it, or flag it for dispute. Every decision requires a note.

**Dispute** → File disputes with supporting documents. Track them through resolution.

**Recover** → See your recovery rate, total dollars back, and which retailers cost you the most.

---

## Architecture

| Decision | Rationale |
|----------|-----------|
| PostgreSQL over SQLite | Concurrent access, proper types, scales with team size |
| Server-side pagination | Client-side filtering breaks past 10K records |
| Hardcoded retailer alias map | Zero false positives vs. fuzzy matching |
| CSV preview before import | Catch errors before they enter the system |
| Mandatory notes on all actions | Accountability through audit trail, not access restrictions |
| Soft deletes | Flagged records hidden from views but preserved in DB |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL |
| Auth | JWT with password policy enforcement |
| Testing | Vitest + Supertest (100 tests) |
| CI/CD | GitHub Actions |
| Hosting | Railway |

---

## Design

Y2K chalkboard aesthetic — dark surfaces, cream panels, window-chrome cards, and a mix of display fonts (Bungee, Fredericka the Great, Playfair Display, Annie Use Your Telescope). The auth page background uses a hand-drawn SVG grid tile.

---

## License

[MIT](LICENSE)
