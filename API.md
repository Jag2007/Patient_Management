# API reference

Base URL: `http://localhost:5050/api`. Interactive version: [Swagger](http://localhost:5050/api/docs) (from [`backend/openapi.yaml`](backend/openapi.yaml)).

**Auth:** send `Authorization: Bearer <access token>` on every request except the four marked *Public*. Access tokens last 15 minutes; `POST /auth/refresh` swaps the httpOnly refresh cookie for a new one. All errors look like `{ "error": "message" }`, validation errors add `fields`.

| Status | Meaning |
|---|---|
| 400 | Invalid input (per-field messages for validation errors) |
| 401 | Not logged in, token expired, or account disabled |
| 403 | Logged in, but your role can't do this |
| 404 | Record not found |
| 409 | Conflict (e.g. appointment already cancelled, username taken) |
| 413 | Request body over 10 KB |
| 429 | Too many requests (login attempts, chat questions) |
| 502 / 503 / 504 | AI service unavailable / busy / too slow |

## Auth

| Method | Endpoint | Purpose | Body / params | Access | Success |
|---|---|---|---|---|---|
| GET | `/health` | Check the server is up | | Public | 200 `{ status: "ok" }` |
| POST | `/auth/login` | Log in | `username`, `password` | Public | 200 `{ token, user }` + refresh cookie |
| POST | `/auth/refresh` | New access token | refresh cookie | Public | 200 `{ token, user }` + new cookie |
| POST | `/auth/logout` | End this session | refresh cookie | Public | 204 |

## Patients

| Method | Endpoint | Purpose | Body / params | Access | Success |
|---|---|---|---|---|---|
| GET | `/patients` | List or search patients | `?search=` name or ID (optional) | Admin, staff | 200 array of patients |
| POST | `/patients` | Create a patient | `name`, `dateOfBirth`, `phone` required; `email`, `address` | Admin, staff | 201 patient (ID generated) |
| GET | `/patients/:patientId` | View a patient | path `P-0007` | Admin, staff | 200 patient (audited) |
| PUT | `/patients/:patientId` | Edit a patient | any of the create fields | Admin, staff | 200 patient |

## Appointments

| Method | Endpoint | Purpose | Body / params | Access | Success |
|---|---|---|---|---|---|
| GET | `/appointments` | List appointments, newest first | `?patientId=` (optional) | Admin, staff | 200 array with `patient { patientId, name }` |
| POST | `/appointments` | Book | `patientId`, `dateTime` (future, within 1 year), `clinician`, `reason` | Admin, staff | 201 appointment |
| PUT | `/appointments/:id` | Edit a scheduled one | any of `dateTime`, `clinician`, `reason` | Admin, staff | 200 appointment · 404 if not found · 409 if not scheduled |
| PATCH | `/appointments/:id/cancel` | Cancel (transaction-safe) | | Admin, staff | 200 appointment · 404 if not found · 409 if already cancelled |

## AI assistant

| Method | Endpoint | Purpose | Body / params | Access | Success |
|---|---|---|---|---|---|
| POST | `/chat` | Ask a question | `question` (≤ 500 chars), `conversationId` (optional) | Admin, staff · 20/min | 200 `{ answer, sources, verified, conversationId }` |
| GET | `/chat/conversations` | Your saved chats | | Admin, staff | 200 `[{ _id, title, updatedAt }]` |
| GET | `/chat/conversations/:id` | Open a chat | | Owner only | 200 chat with messages · 404 if not yours |
| DELETE | `/chat/conversations/:id` | Delete a chat | | Owner only | 204 |

## Admin

| Method | Endpoint | Purpose | Body / params | Access | Success |
|---|---|---|---|---|---|
| GET | `/documents` | Clinic documents the AI reads | | Admin | 200 documents with sections |
| GET | `/audit-logs` | Latest audit entries | `?patientId=` (optional) | Admin | 200 entries with `patientName` |
| GET | `/users` | List accounts | | Admin | 200 users (no password hashes) |
| POST | `/users` | Create a staff login | `username`, `password` (8+ chars, letter + number) | Admin | 201 user · 409 if taken |
| PUT | `/users/:id/password` | Reset a staff password | `password` | Admin | 204 (signs them out everywhere) |
| PATCH | `/users/:id/active` | Disable or enable staff | `active` (boolean) | Admin | 200 user |
| DELETE | `/users/:id` | Delete a staff login | | Admin | 204 |
