# Database setup

Everything needed to create the database from scratch: migrations (schema, validation rules, indexes) and a small synthetic seed dataset.

```
setup/
├── migrate.js              # runs the migrations below, each one only once
├── migrations/
│   ├── 001-initial-schema.js   # users, patients, appointments, audit_logs, faq_sections + indexes
│   ├── 002-chat-history.js     # conversations (AI chat history) + index
│   ├── 003-staff-accounts.js   # users.active + users.lastLoginAt (staff management)
│   └── 004-audit-log-indexes.js # audit_logs indexes for newest-first reads
├── seed.js                 # loads seed-data/ and the FAQ docs into the database
└── seed-data/
    ├── users.json          # 2 demo logins (admin, staff)
    ├── patients.json       # 150 fictional patients: P-0001 … P-0100 in Hyderabad, P-0101 … P-0150 in Bangalore
    └── appointments.json   # 198 appointments; dates are "days from today" so there are always past and upcoming visits
```

All data is synthetic. Names, phone numbers (98765432xx) and emails (`@example.com`) are invented.

## 1. Get a MongoDB connection string (`MONGO_URI`)

**Option A: MongoDB Atlas (recommended, free).**
1. Create a free cluster at https://cloud.mongodb.com.
2. *Database Access* → add a database user with a password.
3. *Network Access* → add your IP address (or `0.0.0.0/0` for a hosted backend).
4. *Connect* → *Drivers* → copy the string and add the database name before the `?`:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/patient_management?retryWrites=true&w=majority
MONGO_URI_TEST=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/patient_management_test?retryWrites=true&w=majority
```

**Option B: local MongoDB.**

```
MONGO_URI=mongodb://127.0.0.1:27017/patient_management
MONGO_URI_TEST=mongodb://127.0.0.1:27017/patient_management_test
```

Atlas is a replica set, so appointment edits and cancellations run inside a real transaction. A plain local `mongod` does not support transactions; the app then saves the same writes without one (each single-document update is still atomic). To get transactions locally, start `mongod --replSet rs0` and run `mongosh --eval "rs.initiate()"` once.

Put both values in `backend/.env` (copy `.env.example` from the repo root).

## 2. Create the schema and load the demo data

```bash
cd backend
npm install
npm run migrate      # collections, validation rules, indexes (safe to run again)
npm run seed         # wipes and reloads users, patients, appointments, FAQ sections
# or both at once:
npm run setup
```

Check which migrations have run: `npm run migrate -- --status`.

## 3. Check it worked (optional, with `mongosh`)

```bash
mongosh "$MONGO_URI" --eval '
  printjson({
    users: db.users.countDocuments(),
    patients: db.patients.countDocuments(),
    appointments: db.appointments.countDocuments(),
    faq_sections: db.faq_sections.countDocuments(),
    migrations: db.migrations.find({}, { _id: 0, name: 1 }).toArray()
  })'
```

Expected: 2 users, 150 patients, 198 appointments, 15 FAQ sections, 4 migrations.

Other useful commands:

```bash
mongosh "$MONGO_URI" --eval 'db.patients.findOne({ patientId: "P-0007" })'           # one patient
mongosh "$MONGO_URI" --eval 'db.getCollectionInfos({ name: "patients" })[0].options'  # its validation rule
mongosh "$MONGO_URI" --eval 'db.faq_sections.getIndexes()'                           # the text index the AI uses
```

## Adding a migration

Create `migrations/003-something.js` exporting `{ description, async up(db) { … } }`, then run `npm run migrate`. Files run in name order, and each is recorded in the `migrations` collection so it never runs twice.
