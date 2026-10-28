# Architecture

| Diagram | Shows |
|---|---|
| [System](system.md) | How the browser, API, database and AI connect |
| [AI assistant flow](ai-flow.md) | Every step from a question to a checked answer |
| [Database](database.md) | Collections, their fields and how they link |

## Architecture note

| | |
|---|---|
| **LLM** | Groq `openai/gpt-oss-20b`, called only from the backend ([`llmService.js`](../backend/services/llmService.js)). Temperature 0, 15 s timeout, JSON-only replies. A second call (the judge) re-checks each answer against its sources. |
| **Retrieval** | MongoDB text-index keyword search over the clinic documents, split into paragraphs. The top 3 matches go to the model, labelled `S1`–`S3`, and the answer must cite them. |
| **AI tools** | `get_patient_details` and `get_patient_appointments` ([`patientTools.js`](../backend/tools/patientTools.js)). The backend checks the user's role, accepts exactly one argument (`patientId` like `P-0001`, or a name), runs one fixed read-only query, returns only whitelisted fields, and writes an audit entry. The model never touches the database. |
