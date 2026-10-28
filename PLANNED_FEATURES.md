# Planned features

Features planned for the next version. None of these are built yet.

---

## 1. AI-built database queries

**Today:** the AI answers from keyword search over clinic documents, plus two fixed patient tools (details, appointments).

**Planned:** the AI reads a description of the database, decides what data the question needs, builds the query, runs it through the backend, and answers from the results.

```
Question
   │
   ▼
AI reads the schema description (collections, fields, what they mean)
   │
   ▼
AI writes a query plan as JSON          e.g. { collection: "appointments", filter: { status: "scheduled",
   │                                           clinician: "Dr. Kavya Iyer" }, fields: [...], limit: 20 }
   ▼
Backend validates the plan  ──── rejected ───►  "I can't look that up"
   │ allowed
   ▼
Backend runs it read-only, scoped to the user's role
   │
   ▼
Results go into the AI's context as a source  ──►  Answer + sources (judge still checks it)
```

How it would be built:

- **Schema description:** a short, hand-written description of each collection and field the AI may use (no passwords, tokens or audit internals). Sent to the model as context.
- **Query plan, not raw queries:** the model only returns JSON with `collection`, `filter`, `fields`, `sort` and `limit`. The backend checks it against an allow-list of collections, fields and operators (`$eq`, `$in`, `$gte`, `$lte`, no `$where` or aggregation code), caps the limit, and runs it with a read-only database user.
- **Same guardrails as today:** the role check runs before any query, every query is written to the audit log, results are labelled as sources, and the judge still checks the answer against them. This answers questions the fixed tools can't, such as *"How many appointments does Dr. Kavya Iyer have next week?"*

---

## 2. Semantic and hybrid search

- **Embeddings:** store a vector for each clinic document paragraph at seed time (a small local model, `all-MiniLM-L6-v2`, so no extra API key).
- **MongoDB as the vector database:** an Atlas Vector Search index and a `$vectorSearch` query, merged with today's keyword search using reciprocal rank fusion.
- **Measured:** re-run the golden set and add synonym questions ("What are the charges?") to show the gain.

---

## 3. Streaming progress

- **Server-Sent Events** from `POST /api/chat` with status steps: *searching documents*, *looking up patient*, *checking answer*.
- **The answer itself still arrives whole,** after the judge has checked it, so unchecked text is never shown.

---

## 4. Cancellation notifications

- **After the cancel transaction commits,** queue a WhatsApp or SMS message to the patient (e.g. Twilio or Meta WhatsApp Cloud API).
- **Retries from a queue,** so a messaging failure never undoes a cancellation; the result is written to the audit log.
