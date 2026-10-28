# Planned features

Features planned for the next version.

---

## Built: AI-built database queries

The first planned feature is now in the app as the **`search_records`** tool. The AI picks a collection and filters, and the backend validates every value, builds the read-only query itself and returns only non-sensitive fields. Details: [architecture/ai-flow.md](architecture/ai-flow.md#ai-tools).

**Next step for it:** more filters (e.g. age range, appointments per patient), and grouped counts ("appointments per clinician this month").

---

## 1. Semantic and hybrid search

- **Embeddings:** store a vector for each clinic document paragraph at seed time (a small local model, `all-MiniLM-L6-v2`, so no extra API key).
- **MongoDB as the vector database:** an Atlas Vector Search index and a `$vectorSearch` query, merged with today's keyword search using reciprocal rank fusion.
- **Measured:** re-run the golden set and add synonym questions ("What are the charges?") to show the gain.

---

## 2. Streaming progress

- **Server-Sent Events** from `POST /api/chat` with status steps: *searching documents*, *looking up patient*, *checking answer*.
- **The answer itself still arrives whole,** after the judge has checked it, so unchecked text is never shown.

---

## 3. Cancellation notifications

- **After the cancel transaction commits,** queue a WhatsApp or SMS message to the patient (e.g. Twilio or Meta WhatsApp Cloud API).
- **Retries from a queue,** so a messaging failure never undoes a cancellation; the result is written to the audit log.
