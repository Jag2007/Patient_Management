# Database

MongoDB Atlas, seven collections. The top row holds the main records; each one below links back to them.

```mermaid
flowchart TB
    patients["<b>patients</b><br/>patientId · name · dateOfBirth<br/>phone · email · address"]
    users["<b>users</b><br/>username · passwordHash<br/>role · active · lastLoginAt"]
    docs["<b>backend/docs/*.md</b><br/>clinic documents"]

    appointments["<b>appointments</b><br/>patient · dateTime · clinician<br/>reason · status"]
    audit["<b>audit_logs</b><br/>username · action · createdAt<br/>patientId / targetUsername"]
    conversations["<b>conversations</b><br/>user · title<br/>messages (role, text, sources)"]
    tokens["<b>refresh_tokens</b><br/>user · tokenHash · expiresAt"]
    faq["<b>faq_sections</b><br/>source · section · text<br/>(text index)"]

    patients ---|"1 to many · _id"| appointments
    patients ---|"patientId"| audit
    users ---|"username"| audit
    users ---|"1 to many · _id"| conversations
    users ---|"1 to many · _id"| tokens
    docs ---|"split by the seed"| faq
```

| Collection | Holds |
|---|---|
| `users` | Admin and staff logins (passwords stored as bcrypt hashes) |
| `patients` | Fictional patient records, IDs like `P-0001` |
| `appointments` | Bookings linked to a patient, status scheduled / completed / cancelled |
| `audit_logs` | Who viewed or changed which patient or staff account, and when |
| `conversations` | Saved AI chats, each owned by one user |
| `refresh_tokens` | One row per login session, deleted automatically when it expires |
| `faq_sections` | Clinic documents split into paragraphs, with a text index for search |

**Indexes:** `patients.patientId` (unique) · `patients.name` · `users.username` (unique) · `appointments.patient + dateTime` · `audit_logs.createdAt` · `conversations.user + updatedAt` · `refresh_tokens.tokenHash` (unique) + TTL on `expiresAt` · text index on `faq_sections.text`.

Migrations: [`backend/setup/migrations/`](../backend/setup/migrations/) · Seed data: [`backend/setup/seed-data/`](../backend/setup/seed-data/)
