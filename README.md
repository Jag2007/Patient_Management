# Patient Management System

A small clinic web app for managing **fictional** patients and appointments. It includes an AI assistant that answers questions from the clinic's FAQ documents and can look up a patient's details or appointments, by name or ID, through two permission-checked tools.

If the answer is not in that data, the assistant says so instead of guessing.

> All data is synthetic. There is no diagnosis or treatment functionality.

---

## Features

- **Login** for clinic staff with two roles: `admin` and `staff`
- **Patients:** create, view, edit, list, and live search by name or patient ID
- **Appointments:** create, view, filter by status, and cancel (with a confirmation step)
- **AI assistant:** answers from clinic FAQ documents and patient records, and always shows its sources
- **AI tools:** `get_patient_appointments` and `get_patient_details`, which the AI can request and the backend checks before running
- **Audit log:** records who viewed or changed which patient, with a per-patient activity timeline (admin only)
- **Documents:** admins can read every clinic document the AI answers from, section by section
- **Seed data:** 100 synthetic patients with about 135 appointments, so lists, search and paging can be tried at a realistic size

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), Ant Design |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| AI | Groq API, model `openai/gpt-oss-20b` |
| Auth | JWT, bcrypt |
| Tests | Jest, Supertest |

---

## Project structure

```
Patient_Management/
├── backend/
│   ├── config/          # database connection
│   ├── models/          # Mongoose schemas (data + validation)
│   ├── routes/          # API endpoints (thin: read request, call service, respond)
│   ├── middleware/      # login check, role check, error handler
│   ├── services/        # business logic (patients, appointments, audit, retrieval, LLM, chat)
│   ├── tools/           # the AI tools and their permission rules
│   ├── utils/           # small helpers (httpError, escapeRegex)
│   ├── docs/            # clinic FAQ documents (fictional)
│   ├── seed/            # script that fills the database with demo data
│   ├── tests/           # Jest + Supertest tests
│   ├── app.js           # Express app setup
│   └── server.js        # starts the server
├── frontend/
│   └── src/
│       ├── api/         # one axios client for all backend calls + session storage
│       ├── pages/       # Login, Patients, Appointments, AI Assistant, Audit Log
│       ├── components/  # layout, forms, activity drawer
│       └── theme.js     # colours and Ant Design theme
├── .env.example
└── README.md
```

---

## Getting started

### Prerequisites
- Node.js 18 or later
- A MongoDB database (MongoDB Atlas free tier or a local `mongod`)
- A Groq API key from https://console.groq.com/keys

### Environment variables

Copy `.env.example` to `backend/.env` and fill in the values.

| Variable | Description |
|---|---|
| `PORT` | Backend port (default `5050`; port 5000 is used by AirPlay on macOS) |
| `MONGO_URI` | MongoDB connection string, including the database name |
| `MONGO_URI_TEST` | A separate database used only by tests |
| `JWT_SECRET` | Random secret used to sign login tokens (e.g. `openssl rand -hex 32`) |
| `GROQ_API_KEY` | Groq API key (used only by the backend) |
| `GROQ_MODEL` | Model name, e.g. `openai/gpt-oss-20b` |
| `CLIENT_ORIGIN` | Frontend URL allowed by CORS (default `http://localhost:5173`) |

### Database setup

No migrations are needed. The Mongoose schemas in `backend/models/` define the collections, and the seed script creates the collections, indexes (including the text index used by the AI) and demo data:

```bash
cd backend
npm install
npm run seed
```

### Run the app

```bash
# 1. Backend
cd backend
npm run dev      # http://localhost:5050

# 2. Frontend (in a new terminal)
cd frontend
npm install
npm run dev      # http://localhost:5173
```

The frontend forwards `/api` requests to the backend (see `frontend/vite.config.js`), so the browser only talks to one address.

### Demo logins

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin@123` | admin |
| `staff` | `Staff@123` | staff |

---

## Deployment (Render + Vercel)

The backend runs on **Render** and the frontend on **Vercel**. Deploy the backend first, because the frontend needs its URL.

**1. MongoDB Atlas:** Network Access → allow `0.0.0.0/0` (Render's IP addresses change). Seed once from your machine with `npm run seed` in `backend/`.

**2. Render (backend):** New → Web Service → connect this repo.

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Environment | `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL=openai/gpt-oss-20b`, `CLIENT_ORIGIN=https://<your-app>.vercel.app` |

Render sets `PORT` itself. `MONGO_URI_TEST` is only for tests and isn't needed.

**3. Vercel (frontend):** Add New → Project → import this repo.

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment | `VITE_API_BASE_URL=https://<your-service>.onrender.com/api` |

`frontend/vercel.json` sends every page (e.g. `/patients`) to `index.html`, so refreshing a page doesn't 404.

**4.** Once Vercel gives you the final URL, put it in Render's `CLIENT_ORIGIN` (comma-separate several, e.g. a custom domain) and redeploy the backend.

> Render's free tier sleeps after 15 minutes idle; the first request after that can take about 50 seconds.

---

## Architecture

```mermaid
flowchart LR
    UI["React frontend"] -->|"request + login token"| API["Express backend"]
    API --> DB[("MongoDB Atlas")]
    API -->|"API key stays here"| AI["Groq LLM"]
```

The frontend never talks to the database or the AI directly. Everything goes through the backend, which is where all permission checks happen.

### How a request works

Every request goes through the same four steps:

1. **Logged in?** `requireLogin` checks the token. No valid token → `401`.
2. **Allowed?** `requireRole` checks the user's role. Wrong role → `403`.
3. **Do the work.** The service validates the input and reads or writes the database.
4. **Respond.** Success returns JSON. Any error is turned into a clean message like `{ "error": "Date of birth cannot be in the future" }`, never a crash or stack trace.

---

## Roles and permissions

| Action | admin | staff |
|---|:-:|:-:|
| Manage patients | ✅ | ✅ |
| Manage appointments | ✅ | ✅ |
| Use the AI assistant and its tools | ✅ | ✅ |
| View the audit log and patient activity | ✅ | ❌ |
| View the AI's documents | ✅ | ❌ |

Permissions are enforced in backend code. The frontend hides the Documents and Audit Log menus for staff only for convenience; calling the API directly still returns `403`.

---

## Database

| Collection | What it stores | Key fields |
|---|---|---|
| `users` | Clinic staff who can log in | `username`, `passwordHash`, `role` |
| `patients` | Fictional patient records | `patientId` (e.g. `P-0001`), `name`, `dateOfBirth`, `phone`, `email`, `address` |
| `appointments` | Appointments linked to a patient | `patient`, `dateTime`, `clinician`, `reason`, `status` |
| `audit_logs` | Who did what to which patient | `username`, `action`, `patientId`, `createdAt` |
| `faq_sections` | Clinic FAQ documents split into paragraphs, searchable by the AI | `source`, `section`, `text` |

**Indexes:** `patients.patientId` (unique), `patients.name`, `users.username` (unique), `appointments.patient + dateTime`, and a **text index** on `faq_sections.text`.

**Validation rules**
- Patient: name required, date of birth not in the future, valid email, phone 10–13 digits
- Appointment: all fields required, date must be in the future and within one year
- Status is one of `scheduled`, `completed`, `cancelled`

---

## API endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Log in, returns a token (10 failed attempts per 15 min per IP) |
| GET | `/api/patients?search=` | admin, staff | List or search patients |
| POST | `/api/patients` | admin, staff | Create a patient |
| GET | `/api/patients/:patientId` | admin, staff | View a patient |
| PUT | `/api/patients/:patientId` | admin, staff | Edit a patient |
| GET | `/api/appointments?patientId=` | admin, staff | List appointments |
| POST | `/api/appointments` | admin, staff | Create an appointment |
| PATCH | `/api/appointments/:id/cancel` | admin, staff | Cancel an appointment |
| POST | `/api/chat` | admin, staff | Ask the AI assistant: `{ question, previousQuestions? }` (rate limited) |
| GET | `/api/audit-logs?patientId=` | admin | View the audit log, or one patient's activity |
| GET | `/api/documents` | admin | The AI's clinic documents, grouped by file and section |

---

## AI assistant

**Main idea:** the AI only answers from information the backend gives it, and the backend checks the answer before the user sees it.

### What happens when you ask a question

```mermaid
flowchart TD
    A["Question"] --> B{"Safe to answer?"}
    B -- "No: empty, too long,<br/>diagnosis or injection" --> X["Polite refusal"]
    B -- Yes --> C["Find matching FAQ sections"]
    C --> C2{"FAQ match, or mentions<br/>a patient name / ID?"}
    C2 -- No --> Y
    C2 -- Yes --> D["Send question + FAQ sections to the AI"]
    D --> E{"AI asks for a<br/>patient tool?"}
    E -- Yes --> F["Backend checks and runs the tool,<br/>sends the result back (max 2 rounds)"]
    F --> G
    E -- No --> G{"Is the answer backed<br/>by the data?"}
    G -- No --> Y["I don't have enough information to answer that."]
    G -- Yes --> Z["Answer + sources"]
```

1. **Check the question.** It must be 1–500 characters. Questions asking for a diagnosis, treatment or medication dosage, and obvious prompt-injection phrases, are refused without calling the AI.
   - **Follow-ups:** the browser also sends the user's last 3 questions so the AI can work out "her appointments" after "tell me about Ananya Rao". Only the user's own questions are accepted, never earlier AI answers (a client could fake those), and each one goes through the same length, character and safety checks.
2. **Find relevant FAQ sections.** Common question words are removed, then MongoDB text search returns the top 3 matching paragraphs (labelled `S1`–`S3`).
3. **Decide whether to call the AI.** If no FAQ section matches and the question doesn't mention a known patient name or ID, the user gets the fallback and **the AI is never called**.
4. **Ask the AI.** It gets the question, today's date, the FAQ sections, and the tools its user is allowed to use. It must answer only from this data and reply in a fixed JSON format: `{ can_answer, answer, used_source_ids }`.
5. **Run tools if requested.** The backend checks and runs each tool (see below), then sends the result back to the AI. This happens at most 2 rounds, so the model cannot loop.
6. **Check the answer.** If the JSON is broken, `can_answer` is false, or the AI cites a source that wasn't actually provided, the user gets *"I don't have enough information to answer that."*
7. **Show sources.** Source labels (e.g. `cancellation-policy.md (section 2)` or `Patient record for P-0003 (Priya Sharma)`) are built by the backend, so the AI cannot invent them.

### LLM settings (`services/llmService.js`, the only file that talks to Groq)

| Setting | Value | Why |
|---|---|---|
| Model | `GROQ_MODEL` env (`openai/gpt-oss-20b`) | Fast, supports tool calling, swappable without code changes |
| Temperature | 0 | Most predictable output |
| Timeout | 15 seconds, no automatic retries | Fail fast with a clear message |

If Groq is slow, down or rate-limited, the user sees a friendly message ("The assistant is busy right now…") instead of an error.

### Why keyword search instead of embeddings?

The FAQ is small, and keyword search is simple, predictable and easy to debug: you can see exactly why a paragraph matched. The trade-off is that it misses synonyms (see Known limitations).

---

## Clinic documents (the AI's knowledge)

All fictional. They live in `backend/docs/`, and `npm run seed` splits each into paragraph sections (`faq_sections`). Admins can read them on the **Documents** page; section numbers match the source tags under chat answers.

| File | Title | What it covers |
|---|---|---|
| `opening-hours.md` | Opening Hours | Weekday and Saturday hours, walk-in times, pharmacy hours |
| `cancellation-policy.md` | Cancellation Policy | Free cancellation window, the 300-rupee late fee, missed-appointment rule |
| `billing.md` | Billing and Payments | Consultation prices, payment methods (cash, cards, UPI), receipts |
| `insurance.md` | Insurance | Partner insurers, documents to bring, reimbursement for other insurers |
| `contact.md` | Contact Information | Address, parking, phone and email, emergency number |

---

## AI tools

The AI can **request** these tools using Groq function calling, but only the backend decides whether they run.

Each tool is one entry in the `TOOLS` object in `tools/patientTools.js`: its allowed roles, description, read-only query, source label, and the fixed reply to give when it finds nothing. The chat service never mentions tool names, so adding a tool means adding one entry.

| Tool | Returns |
|---|---|
| `get_patient_appointments` | Date/time, clinician, reason and status of each appointment |
| `get_patient_details` | Patient ID, name, date of birth, age, phone, email, address |

Each tool takes **exactly one** argument: `patientId` (e.g. `P-0003`) or `name` (e.g. `Priya Sharma`).

| Step | What the backend does |
|---|---|
| 1. Permission | Checks the logged-in user's role is in that tool's `roles`. Tools the user can't use are not even offered to the AI. |
| 2. Validation | Arguments must be valid JSON with exactly one field: `patientId` in the format `P-0000`, or a plain name |
| 3. Find patient | If no patient matches, or a name matches several patients, the backend replies directly (e.g. *"I found more than one matching patient: P-0003 Ravi Kumar, P-0004 Ravi Shankar. Please ask again with the patient ID."*) without asking the AI to guess |
| 4. Audit | Records who looked up which patient (`ai.tool.get_patient_details`, etc.) |
| 5. Query | Runs one fixed, read-only database query and returns only the fields above |

The AI never gets direct database access. Medical data such as lab values is not stored, so questions like *"What is Sneha's blood pressure?"* get the "not enough information" answer.

---

## Safety

- **Synthetic data only.** No real patient information.
- **No diagnosis or treatment.** These questions are refused before reaching the AI, and the prompt forbids it too.
- **No made-up answers.** The AI answers only from the FAQ or tool results; otherwise it says it doesn't know.
- **No made-up sources.** Sources are built by the backend from what was actually retrieved.
- **Untrusted input.** User messages, documents and tool results are wrapped in tags and treated as data, not instructions. Angle brackets are stripped from questions.
- **Access control in code.** Permissions are checked by the backend, never by the AI prompt.
- **Brute-force protection.** Failed logins are limited to 10 per 15 minutes per IP; chat is limited to 20 questions per minute per user.
- **Safe startup.** The server refuses to start if `MONGO_URI` or `JWT_SECRET` is missing, with a clear message.
- **No secrets in the repo.** API keys live only in `backend/.env`, which is git-ignored.

---

## Bonus features

**Audit log.** Viewing, creating or editing a patient, creating or cancelling an appointment, and every AI tool call are recorded with the username, action and patient ID. No other patient details are stored. When an admin reads the log, current patient names are looked up and added for display only. Admins can filter the log by user or action, and click a patient (or "Activity" on the Patients page) to see their details and full history as a timeline.

**Safe cancellation.** The UI asks *"Are you sure?"* before cancelling. The backend cancels with a single atomic update that only matches appointments still `scheduled`:

```js
Appointment.findOneAndUpdate({ _id: id, status: 'scheduled' }, { status: 'cancelled' })
```

A double click can't cancel twice; the second attempt gets `409 Conflict`. No multi-document transaction is needed, because MongoDB updates to a single document are atomic.

---

## Testing

```bash
cd backend
npm test
```

37 tests run against the separate `MONGO_URI_TEST` database. The AI tests replace Groq with a Jest mock, so they never call the real API. That also lets them simulate the model misbehaving.

**Core API**
- Correct login returns a token and role; requests without a token are rejected; wrong username and wrong password give the same error
- Invalid patient data is rejected with a message per field
- Editing a patient works, ignores non-editable fields (like `patientId`) and writes an audit entry
- Too many failed logins from one IP are blocked with `429`
- Appointments in the past or more than a year ahead are rejected
- Cancelling the same appointment twice fails the second time
- Staff get `403` on the audit log; admins can read the AI's documents grouped by file and staff get `403`; the log stores only patient IDs

**AI tools**
- A disallowed role, an unknown tool, a bad patient ID, extra arguments, both `patientId` and `name`, and non-JSON arguments are all rejected
- Lookup by name works, and an ambiguous name returns only the list of matches
- The appointments tool returns only its 4 fields and writes an audit entry

**AI chat guardrails**
- Diagnosis and injection questions are refused without calling the AI
- An unrelated question gets the fallback without calling the AI
- A fake source (`S9`) or broken JSON from the model gives the fallback
- A tool request is run and its source is shown; no appointments gives a fixed reply
- The model is stopped after 2 tool rounds
- A follow-up ("her appointments") uses earlier questions; without them it gets the fallback; unsafe or fake earlier messages are dropped
- An empty question returns `400`; an AI timeout returns a friendly message

---

## Assignment checklist

| Requirement | Where it is met |
|---|---|
| Create, view, edit, list patients with ID, name, DOB, contact details | `services/patientService.js`, `models/Patient.js`, `pages/PatientsPage.jsx` |
| Search by name or ID, clear validation and error messages | `listPatients()` in `patientService.js`, `middleware/errorHandler.js` |
| Create and view appointments with date/time, clinician, reason, status | `services/appointmentService.js`, `models/Appointment.js`, `pages/AppointmentsPage.jsx` |
| Reject invalid appointment dates | `checkAppointmentDate()` in `appointmentService.js` + date picker limits |
| Chat over clinic FAQ documents and synthetic patient data | `services/chatService.js`, `pages/ChatPage.jsx` |
| LLM called only from the backend, no keys in the frontend | `services/llmService.js`, key read from `backend/.env` |
| Retrieval with source references | `services/retrievalService.js`, sources built in `chatService.js` |
| Say so when the answer is not supported | Retrieval gate, `can_answer` flag, source check → fixed fallback |
| Handle timeouts, invalid input, AI/API failures | `checkQuestion()`, `llmService.js` error mapping, `errorHandler.js` |
| At least one narrowly scoped tool with argument validation and permissions | `tools/patientTools.js` (`TOOLS[...].roles`, `parseArguments()`) |
| No unrestricted database access for the model | Tools run fixed read-only queries and return whitelisted fields |
| Synthetic data only | `seed/seed.js`, `docs/*.md` |
| No diagnosis or treatment functionality | `MEDICAL_PATTERNS` refusal + system prompt |
| Permissions enforced before data access or tools (not by prompt) | `middleware/auth.js`, `canUseTool()` in `patientTools.js` |
| User messages and documents treated as untrusted | Tags + "data, not instructions" prompt rule, angle brackets stripped, injection filter |
| No secrets in the repo | `.gitignore`, `.env.example` with names only |
| README, schema + seed data, `.env.example`, architecture note, tests, limitations | This README (Database, Architecture, AI assistant, AI tools, Testing, Known limitations), `npm run seed`, `backend/tests/` |
| Bonus: audit events | `services/auditService.js`, `pages/AuditLogsPage.jsx`, activity drawer |
| Bonus: cancellation with confirmation, transaction-safe | `Popconfirm` in `AppointmentsPage.jsx`, atomic `cancelAppointment()` |

---

## Known limitations

| Limitation | Next step |
|---|---|
| Keyword search misses synonyms ("fees" vs "billing") | Add embedding-based search (e.g. Atlas Vector Search) |
| Chat is kept only in the browser tab (cleared on logout), and responses aren't streamed | Store conversations per user on the server; stream answers with server-sent events |
| Safety filter is keyword-based and can be bypassed by rephrasing (the prompt and tool limits are the second line of defence) | Add a moderation model before the main call |
| No check that numbers in an answer appear in the source text | Compare numbers in the answer against the retrieved text |
| All staff can see all patients | Assign patients to clinicians and check ownership in services and tools |
| JWT is stored in the browser and there are no refresh tokens | httpOnly cookies with refresh-token rotation |
| Groq free tier allows about 8,000 tokens per minute | Paid tier or caching of common FAQ answers |
