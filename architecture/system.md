# System architecture

The browser only talks to the Express API. The API checks who you are and what you may do, then reads and writes MongoDB or calls Groq. The Groq key never leaves the server.

```mermaid
flowchart LR
    subgraph Client["Browser"]
        UI["React app<br/>Patients · Appointments · AI Assistant<br/>Documents · Audit Log · Staff"]
    end

    subgraph Server["Express API"]
        direction TB
        MW["helmet · CORS · gzip · JSON · cookies"]
        AUTH["requireLogin · requireRole<br/>JWT + account still active"]
        SVC["Services<br/>patients · appointments · staff<br/>audit · chat · auth"]
        MW --- AUTH --- SVC
    end

    subgraph Data["MongoDB Atlas"]
        DB[("patients · appointments · users<br/>audit_logs · conversations<br/>faq_sections · refresh_tokens")]
    end

    subgraph AI["AI"]
        direction TB
        LLM["Groq · openai/gpt-oss-20b<br/>answer + judge"]
        TOOLS["Patient tools<br/>read-only, role-checked"]
        LLM --- TOOLS
    end

    UI ---|"HTTPS · access token<br/>refresh cookie"| MW
    SVC --- DB
    SVC ---|"question + context"| LLM
    TOOLS --- DB
```

| Piece | Where |
|---|---|
| Access token | JWT, 15 minutes, sent as `Authorization: Bearer` |
| Refresh token | Random 96-char token, 7 days, httpOnly cookie on `/api/auth`, stored hashed, replaced on every use |
| API docs | Swagger at `/api/docs` · table in [API.md](../API.md) |
