// Builds the Express app: security middleware, routes, and the error handler (always last).
// It does not start listening, so tests can import it with Supertest without opening a port.
// server.js connects the database and starts the app.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { requireLogin } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', requireLogin, require('./routes/patientRoutes'));
app.use('/api/appointments', requireLogin, require('./routes/appointmentRoutes'));
app.use('/api/audit-logs', requireLogin, require('./routes/auditLogRoutes'));

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
