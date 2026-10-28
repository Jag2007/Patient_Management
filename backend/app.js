// Express app: security middleware, Swagger docs, routes and the error handler.
// It doesn't listen on a port, so tests can load it directly. server.js starts it.
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const helmet = require('helmet');
const { requireLogin } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Requests come through the host's proxy (e.g. Render). Trusting it lets the rate limiters see each user's real IP.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression()); // gzip: the appointments list goes from ~63 KB to ~6 KB
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '10kb' }));

const openapi = YAML.parse(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Patient Management API' }));

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
