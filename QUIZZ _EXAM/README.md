# Real-Time Interactive Quiz & Examination Platform

A secure, full-stack, enterprise-grade real-time interactive examination platform designed for simultaneous evaluation across 4 candidate accounts with 1 administrator console.

---

## 🌟 Key Features

1. **Role-Based Accounts & Strict Data Privacy**:
   - **1 Admin Account**: Full control over question bank parsing, exam scheduling, live monitoring, deadline adjustments, result releases, and cross-candidate comparative analytics.
   - **Exactly 4 Permanent Participant Accounts (`P001`, `P002`, `P003`, `P004`)**: Individual logins, waiting rooms, private exam interfaces, independent report cards, and step-by-step mistake explanations. Participants are strictly isolated from one another and cannot access admin dashboards or unreleased answer keys.

2. **Universal Question-Paper Parsing Engine**:
   - **PDF Upload**: Automatic text extraction with OCR fallback for scanned pages.
   - **CSV Upload**: Flexible column mapping (`question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `explanation`, `marks`, `negative_marks`, `topic`).
   - **Microsoft Word (DOC / DOCX)**: Paragraph extraction and structured question association.
   - **TXT & Plain Text Paste**: Structured delimiter parsing (`Question 1:`, `A.`, `B.`, `C.`, `D.`, `Correct Answer:`, `Explanation:`).
   - **Interactive Validation & Approval Screen**: Review every question, edit statements, modify options, adjust correct answers, add explanations, reorder, delete, and approve before publishing.

3. **Simultaneous Real-Time Exam Distribution**:
   - Pre-exam waiting room with automatic WebSocket launch notifications.
   - Authoritative backend countdown clock and deadline control.
   - Live administration controls: **Start**, **Pause**, **Resume**, **Extend Duration**, **End Exam**, and **Release Results**.

4. **Network Disconnection Recovery**:
   - Local temporary recovery queue in `localStorage` safely preserves answers if internet drops or device restarts.
   - Automatic background reconnection with exponential backoff.
   - Batch synchronization endpoint (`/api/session/{examId}/sync`) restores state and reconciles answers with the server.
   - Visual synchronization indicator and warning banner.

5. **Server-Side Scoring & Protection**:
   - Answer keys and explanations are completely stripped from candidate-facing API payloads during active examinations.
   - Automated grading supporting positive marks and optional negative marking.
   - Separate, precise metrics: **Score**, **Percentage**, **Accuracy**, **Attempt Rate**, and **Completion Rate**.
   - Timing analytics: fastest and slowest responses, average time per question, and topic-wise breakdown.

6. **Comprehensive Analytics & Exporting**:
   - **Participant Report Cards**: Branded, downloadable PDF report cards.
   - **Detailed Mistake Reviews**: Step-by-step solutions, correct answer rationales, and filters for mistakes.
   - **Admin Comparison Dashboard**: Recharts visual analytics (bar charts, stacked distributions, time comparisons, topic benchmarks).
   - **Official Rankings**: Configurable tie-breaking policy (Primary: Marks, Secondary: Accuracy, Tertiary: Total time).
   - **Data Exports**: Download complete 4-candidate results as **CSV** and **Excel (.xlsx)**.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (with pip)
- Node.js 18+ (bundled or installed)

### 1. Database Initialization & Seeding
Run the seeding script to create database tables and bootstrap accounts:
```bash
python backend/seed.py
```

### 2. Run the Platform (One-Click)
Run the root launcher:
```bash
python run.py
```
- **Web Application**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive Swagger API Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 👥 Default Credentials

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `AdminPass@2026` | Full management console access |
| **Participant 1** | `P001` | `Pass@P001` | Alice |
| **Participant 2** | `P002` | `Pass@P002` | Bob |
| **Participant 3** | `P003` | `Pass@P003` | Charlie |
| **Participant 4** | `P004` | `Pass@P004` | Diana |

*Admin can reset participant passwords anytime from the Admin Dashboard.*

---

## 🧪 Running Automated Tests

A comprehensive test suite covering authentication, format parsers, scoring calculations, and the full 15-stage 4-participant lifecycle:
```bash
python -m pytest backend/tests -v
```

---

## 📁 Project Architecture

```
QUIZZ _EXAM/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, WebSockets, CORS, SPA static serving
│   │   ├── config.py            # JWT settings, database URLs, paths
│   │   ├── database.py          # SQLAlchemy async engine & session factory
│   │   ├── models/              # Relational models (User, Paper, Exam, Attempt, Result, Audit)
│   │   ├── schemas/             # Pydantic schemas for request validation & responses
│   │   ├── routers/             # API routes (auth, papers, exams, session, monitoring, reports, analytics)
│   │   └── services/            # Core business logic (auth, parsers, eval, ws_manager, pdf, export)
│   ├── tests/                   # Pytest automated test suites
│   └── seed.py                  # Database bootstrapper for 1 admin + 4 participants
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, DisconnectionBanner, CountdownTimer, Palette, ConfirmModal
│   │   ├── context/             # AuthContext (JWT session management)
│   │   ├── pages/               # LandingPage, LoginPages, Admin views, Participant views
│   │   └── services/            # API client and local recovery queue service
│   ├── dist/                    # Production built SPA bundle
│   └── vite.config.ts           # Vite configuration with proxy to FastAPI
├── sample_papers/               # Ready-to-use sample question papers (PDF, CSV, DOCX, TXT)
├── uploads/                     # Secure storage for original uploaded exam files
├── run.py                       # Single-command runner script
└── README.md
```

---

## ⚙️ Production Deployment

1. **Database**: Point `DATABASE_URL` to your production PostgreSQL cluster:
   ```bash
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/exam_db
   ```
2. **Reverse Proxy (Nginx)**: Configure Nginx to terminate SSL/TLS (HTTPS) and proxy WebSocket connections (`/ws/`) using `Upgrade` and `Connection` headers.
3. **Execution**: Run with Uvicorn or Gunicorn with Uvicorn workers:
   ```bash
   uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```
