# How the AI answers a question

The model only answers from what the backend gives it, and the backend checks the answer before it is shown. Anything that fails a check becomes *"I don't have enough information to answer that."*

```mermaid
flowchart LR
    Q(["Question"]) --> Safe{"Safe?<br/>1–500 chars, no diagnosis,<br/>no prompt injection"}
    Safe -- no --> Refuse(["Polite refusal"])
    Safe -- yes --> Find["Find context<br/>top 3 clinic doc sections<br/>+ last 3 chat turns"]
    Find --> Any{"Anything<br/>relevant?"}
    Any -- no --> Fallback(["Not enough information"])
    Any -- yes --> LLM["LLM drafts answer<br/>as JSON with source IDs"]
    LLM -- "needs patient data" --> Tool["Patient tool<br/>role check → validate args<br/>→ read-only query → audit"]
    Tool -- "result (max 2 rounds)" --> LLM
    LLM --> Cited{"Cited sources<br/>really given?"}
    Cited -- no --> Fallback
    Cited -- yes --> Judge{"Judge LLM:<br/>answers the question and<br/>backed by the sources?"}
    Judge -- no --> Fallback
    Judge -- yes --> Answer(["Answer + sources<br/>saved to chat history"])
```

| Source ID | What it is |
|---|---|
| `S1`–`S3` | Clinic document sections found by keyword search |
| `T1`, `T2` | Results from `get_patient_details` / `get_patient_appointments` |
| `H1` | Earlier turns of this chat |
