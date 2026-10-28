// Builds the Express app: security middleware, gzip compression, routes, and the error handler (always last).
// It does not start listening, so tests can import it with Supertest without opening a port.
// server.js connects the database and starts the app.
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const { requireLogin } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// On Render (and most hosts) requests arrive through a proxy; trust it so rate limits see each user's real IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression()); // gzip responses: e.g. the appointments list shrinks from ~63 KB to ~6 KB
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', requireLogin, require('./routes/patientRoutes'));
app.use('/api/appointments', requireLogin, require('./routes/appointmentRoutes'));
app.use('/api/audit-logs', requireLogin, require('./routes/auditLogRoutes'));
app.use('/api/chat', requireLogin, require('./routes/chatRoutes'));
app.use('/api/documents', requireLogin, require('./routes/documentRoutes'));
app.use('/api/users', requireLogin, require('./routes/userRoutes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
