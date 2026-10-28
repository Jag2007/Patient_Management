# Patient Management System

A clinic staff portal for managing patients and appointments, with an AI assistant that answers from clinic documents and patient records.

All data is fictional. The app gives no diagnosis or treatment advice.

**Stack:** React (Vite) + Ant Design · Node.js + Express · MongoDB Atlas · Groq (`openai/gpt-oss-20b`) · JWT · Jest

---

## Features

```mermaid
flowchart TB
    Site(["Patient Management · login as admin or staff"])
    Site --> P["<b>Patients</b>"] --> P1["Add · view · edit<br/>Search name or ID<br/>Filter city, age, area<br/>Sort ID, name, age"]
    Site --> A["<b>Appointments</b>"] --> A1["Book · edit<br/>Cancel with confirmation<br/>Filter status, clinician, dates<br/>Sort date, patient"]
    Site --> AI["<b>AI Assistant</b>"] --> AI1["Clinic FAQ answers<br/>Patient details and visits<br/>Sources on every answer<br/>Saved chat history"]
    Site --> D["<b>Documents</b> · admin"] --> D1["Clinic docs<br/>the AI reads"]
    Site --> L["<b>Audit Log</b> · admin"] --> L1["Who did what,<br/>to whom, when"]
    Site --> S["<b>Staff</b> · admin"] --> S1["Add login · reset password<br/>Disable · delete"]
```

---

## Setup and run

You need **Node.js 18+**, a **MongoDB** connection string ([Atlas free tier](https://cloud.mongodb.com) works) and a **Groq API key** ([get one here](https://console.groq.com/keys)).

```bash
git clone https://github.com/Jag2007/Patient_Management.git
cd Patient_Management
make setup     # installs packages, creates backend/.env (asks for your MongoDB URI and Groq key), loads demo data
make dev       # opens on http://localhost:5173
```

Log in with `admin` / `Admin@123` or `staff` / `Staff@123`.

<details>
<summary>Without Make</summary>

```bash
git clone https://github.com/Jag2007/Patient_Management.git
cd Patient_Management
cd backend && npm ci && npm run init-env && npm run setup && cd ..
cd frontend && npm ci && cd ..
cd backend && npm run dev          # terminal 1
cd frontend && npm run dev         # terminal 2
```
</details>

**Environment:** `make setup` writes `backend/.env` from [`.env.example`](.env.example) for you. [`frontend/.env.example`](frontend/.env.example) is only needed when the frontend is hosted separately.

### Make commands

| Command | Does |
|---|---|
| `make setup` | First-time setup: install, create `.env`, create and fill the database |
| `make dev` | Run backend and frontend together (Ctrl+C stops both) |
| `make db` | Recreate the database and reload the demo data |
| `make test` | Run the tests |
| `make eval` | Check the AI's answers against the real model |
| `make check` | Tests + production build + security audit, before pushing |
| `make` | List every command |

---

## API

Interactive docs (Swagger): **http://localhost:5050/api/docs** once the backend is running. Spec: [`backend/openapi.yaml`](backend/openapi.yaml).

---

## Architecture

Diagrams and the architecture note are in [`architecture/`](architecture/README.md): [system](architecture/system.md) · [how the AI answers](architecture/ai-flow.md) · [database](architecture/database.md).

---

## Project structure

```
Patient_Management/
├── architecture/      diagrams and architecture note
├── backend/
│   ├── routes/        API endpoints
│   ├── services/      business logic (patients, appointments, staff, chat, LLM)
│   ├── tools/         the AI's patient tools
│   ├── models/        database schemas
│   ├── middleware/    login and role checks, error handling
│   ├── docs/          clinic documents the AI answers from
│   ├── setup/         .env helper, migrations, seed data
│   ├── tests/         Jest tests
│   └── openapi.yaml   API spec for Swagger
├── frontend/src/
│   ├── pages/         Patients, Appointments, AI Assistant, Documents, Audit Log, Staff
│   ├── components/    layout, forms, tables
│   └── api/           backend client
├── Makefile
└── .env.example
```

---

## Database

MongoDB, six collections ([diagram](architecture/database.md)):

- **users**: admin and staff logins
- **patients**: fictional patient records (ID, name, date of birth, contact details)
- **appointments**: bookings linked to a patient, with clinician, reason and status
- **audit_logs**: who viewed or changed which patient or staff account
- **conversations**: saved AI chats
- **faq_sections**: clinic documents split into searchable paragraphs

Schema and indexes are created by [migrations](backend/setup/migrations/) (`make migrate`). Demo data in [`backend/setup/seed-data/`](backend/setup/seed-data/): 2 users, 150 patients across Hyderabad and Bangalore, 198 appointments (`make seed`).

---

## Tests

```bash
make test    # 49 tests: login, patients, appointments, staff, AI tools, chat guardrails
make eval    # 12 questions to the real model, checking answers and sources
```

Tests use `MONGO_URI_TEST` and a mocked LLM, so they never call Groq.

---

## Known limitations

- Keyword search only, so it misses synonyms ("fees" vs "billing")
- Answers aren't streamed
- Every staff member can see every patient
- The login token is kept in the browser, with no refresh tokens
- Groq's free tier limits how many questions per minute the AI can answer
