// Entry point: checks the required .env settings, connects to MongoDB and starts the server.
require('dotenv').config({ quiet: true });
const connectDB = require('./config/db');
const app = require('./app');

const REQUIRED_SETTINGS = ['MONGO_URI', 'JWT_SECRET'];
const PORT = process.env.PORT || 5050;

const missing = REQUIRED_SETTINGS.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required settings in backend/.env: ${missing.join(', ')}. See .env.example.`);
  process.exit(1);
}
if (!process.env.GROQ_API_KEY) console.warn('GROQ_API_KEY is not set: the AI assistant will be unavailable.');

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
