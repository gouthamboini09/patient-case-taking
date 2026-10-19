# 🩺 CaseWise – Patient Case-Taking Software

A full-stack clinical case-taking system. Instead of paper forms, a clinician walks through a **guided 6-step wizard** (patient → complaint → history → systems & lifestyle → vitals & exam → diagnosis & plan) while the system **checks for danger signs in real time** and automatically assigns a **triage level**.

> ⚠️ Decision-support only. Alerts never replace clinical judgement.

## ✨ Features

| Area | What it does |
|---|---|
| **Guided wizard** | 6-step case-taking with tag inputs, quick-pick chips and a pain slider |
| **Smart triage engine** | Flags abnormal vitals, high-risk symptoms (chest pain, stroke signs, bleeding…) and assigns `routine / urgent / critical` |
| **Allergy ↔ drug conflict check** | Warns if a listed/planned drug clashes with a recorded allergy (e.g. penicillin vs. amoxicillin) |
| **Voice dictation** | 🎤 speech-to-text for history, examination and plan (browser Web Speech API) |
| **Returning patients** | Allergies, past history and medications are pre-filled from earlier visits |
| **Dashboard** | KPIs, 14-day case trend, triage mix, top complaints, age groups |
| **PDF case sheet** | One-click printable PDF with triage banner, vitals and alerts |
| **Role-based access** | `admin`, `doctor`, `nurse` (nurses can't edit or delete cases) |
| **Audit log** | Every login, view, create, update and delete is recorded (admin view) |
| **Security basics** | JWT auth, bcrypt-hashed passwords, input validation with Pydantic |

## 🧱 Tech stack

- **Backend:** FastAPI, SQLAlchemy 2, SQLite (swap via `DATABASE_URL`), JWT, ReportLab
- **Frontend:** React 18, Vite, React Router, Recharts
- **Tests:** pytest (triage rules, auth, role checks, full API flow)
- **Deploy:** Docker Compose

## 🚀 Run locally

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed_demo.py                                  # optional demo data
uvicorn app.main:app --reload                        # http://localhost:8000/docs
```

**Frontend**
```bash
cd frontend
npm install
npm run dev                                          # http://localhost:5173
```

**Or with Docker:** `docker compose up --build` → open http://localhost:8080

**Demo logins:** `doctor / doctor123` · `nurse / nurse123` · `admin / admin123`
(Change these and set `SECRET_KEY` before any real use.)

## 🧪 Tests
```bash
cd backend && python -m pytest -q
```

## 📁 Structure
```
backend/
  app/
    main.py          # app, CORS, user seeding
    models.py        # User, Patient, Case, AuditLog
    schemas.py       # request/response validation
    auth.py          # JWT + role guards
    triage.py        # rule-based red-flag engine  ← the "brain"
    pdf.py           # case sheet PDF
    routers/         # auth, patients, cases, analytics
  tests/test_api.py
  seed_demo.py
frontend/src/
  pages/             # Login, Dashboard, Patients, PatientDetail, CaseWizard, CaseView, Audit
  components.jsx     # TagInput, VoiceArea, Badge
  api.js
```

## 🔌 API highlights
`POST /api/auth/login` · `GET/POST /api/patients` · `POST /api/cases` (returns computed triage) ·
`GET /api/cases/{id}/pdf` · `GET /api/analytics/summary` · `GET /api/audit` (admin) · interactive docs at `/docs`.

## 🗺️ Future work
ICD-10 code search, lab-report uploads, appointment scheduling, multi-language voice input,
ML-based differential suggestions, FHIR export, PostgreSQL + Alembic migrations.

## 📜 Disclaimer
Educational project. Not a certified medical device; do not use for real patient care without clinical, security and regulatory review.
