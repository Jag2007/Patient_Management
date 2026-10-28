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

**1. Get the code**

```bash
git clone https://github.com/Jag2007/Patient_Management.git
cd Patient_Management
```

**2. Set up and run.** Pick one. Make is only a shortcut: every `make` command runs the npm commands shown next to it, and the app itself doesn't need Make.

| Step | With Make (macOS / Linux) | Without Make (any OS) |
|---|---|---|
| Install packages | `make setup` does all three steps | `cd backend && npm ci` · `cd frontend && npm ci` |
| Create `backend/.env` | | `cd backend && npm run init-env` |
| Create and fill the database | | `cd backend && npm run setup` |
| Run | `make dev` (both apps, Ctrl+C stops both) | `cd backend && npm run dev` and, in a second terminal, `cd frontend && npm run dev` |

Then open **http://localhost:5173** and log in with `admin` / `Admin@123` or `staff` / `Staff@123`.

- **`.env`:** the setup step asks for your MongoDB URI and Groq key, generates `JWT_SECRET`, and writes `backend/.env` from [`.env.example`](.env.example). [`frontend/.env.example`](frontend/.env.example) is only needed when the frontend is hosted separately.
- **`npm ci`** ("clean install") installs the exact versions in `package-lock.json` and fails if they don't match `package.json`. `npm install` may update the lock file. `ci` gives everyone the same dependencies.

**Other Make commands:** `make db` (reload demo data) · `make test` · `make eval` · `make check` (tests + build + security audit) · `make` (list all).

---

## API

- **Table of every endpoint:** [API.md](API.md)
- **Interactive docs (Swagger):** http://localhost:5050/api/docs once the backend is running

---

## Architecture

Diagrams in [`architecture/`](architecture/README.md): [system](architecture/system.md) · [how the AI answers](architecture/ai-flow.md) (with chat history and context handling) · [database](architecture/database.md).

---

## Project structure

```
Patient_Management/
├── architecture/      diagrams
├── backend/
│   ├── routes/        API endpoints
│   ├── services/      business logic (auth, patients, appointments, staff, chat, LLM)
│   ├── tools/         the AI's patient tools
│   ├── models/        database schemas
│   ├── middleware/    login and role checks, error handling
│   ├── docs/          clinic documents the AI answers from
│   ├── setup/         .env helper, migrations, seed data
│   ├── eval/          golden set and benchmark results
│   ├── tests/         Jest tests
│   └── openapi.yaml   API spec for Swagger
├── frontend/src/
│   ├── pages/         Patients, Appointments, AI Assistant, Documents, Audit Log, Staff
│   ├── components/    layout, forms, tables
│   └── api/           backend client, token refresh
├── API.md
├── Makefile
└── .env.example
```

---

## Database

MongoDB, seven collections ([diagram](architecture/database.md)):

- **users**: admin and staff logins
- **patients**: fictional patient records (ID, name, date of birth, contact details)
- **appointments**: bookings linked to a patient, with clinician, reason and status
- **audit_logs**: who viewed or changed which patient or staff account
- **conversations**: saved AI chats
- **refresh_tokens**: login sessions (hashed, auto-deleted when expired)
- **faq_sections**: clinic documents split into searchable paragraphs

Schema and indexes are created by [migrations](backend/setup/migrations/) (`make migrate`). Demo data in [`backend/setup/seed-data/`](backend/setup/seed-data/): 2 users, 150 patients across Hyderabad and Bangalore, 198 appointments (`make seed`).

---

## Tests and evaluation

```bash
make test    # 54 tests: auth and refresh tokens, patients, appointments, staff, AI tools, chat guardrails
make eval    # golden set against the real model; results in backend/eval/RESULTS.md
```

**Mocked LLM:** in the tests, `jest.mock` replaces `llmService.chat` with a fake function that returns replies we script: a normal JSON answer, a tool request, broken JSON, a made-up source, a timeout. Nothing goes over the network, so tests are free, fast and give the same result every run, and they can check how the backend handles a model that misbehaves (which the real model rarely does on demand). The real model is measured separately by `make eval`.

**Golden set:** 38 real questions with reference answers (clinic FAQ, patient details and appointments, multi-turn follow-ups, and questions it must decline), scored against the real model. Last run: **37/38 correct (97.4%)**, 100% of answers cited the right source, 100% of unsafe or unanswerable questions declined, about 2 s per question. The one miss and the weak spots are explained in [`backend/eval/RESULTS.md`](backend/eval/RESULTS.md).

---

## Known limitations

| Area | Limitation | Impact | Planned improvement |
|---|---|---|---|
| Retrieval | Keyword search (MongoDB `$text`), no embeddings | Misses synonyms and paraphrases ("fees" vs "billing"), so some answerable questions get the fallback | Hybrid search: Atlas Vector Search embeddings plus the current keyword score |
| Answers | Responses arrive whole, not streamed | The user waits for the answer and the judge check (two LLM calls) | Stream progress states over SSE; keep the answer itself checked before display |
| Chat memory | Only the last 6 messages are sent to the model | References to much older turns can't be resolved | Rolling summary of older turns stored on the conversation |
| Access control | Every staff member can see every patient | No per-clinician data separation | Assign patients to clinicians and check ownership in services and AI tools |
| Sessions | The access token lives in localStorage; the 30 s account cache is per server process | An XSS bug could read the 15-minute token; with several servers a disabled user may keep access for up to 30 s | Keep the access token in memory only; move the cache to Redis or drop it |
| Safety filter | Diagnosis and injection refusal is regex-based | Rephrased requests can slip past the first check (the prompt and judge remain) | Add a moderation model before the main call |
| Cost and limits | Groq free tier (~8,000 tokens per minute); up to 4 LLM calls per question | Bursts of questions get a "busy" message | Paid tier, caching of common FAQ answers |
| Notifications | No patient notification on cancellation | Patients aren't told automatically | Send a WhatsApp/SMS message from `cancelAppointment` after the transaction commits, retried from a queue so a messaging failure never undoes a cancellation |
