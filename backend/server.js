// Entry point: loads .env, connects to MongoDB, then starts the HTTP server.
// Run with "npm run dev" (auto-restart) or "npm start".
require('dotenv').config({ quiet: true });
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5050;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((error) => {
    console.error('Could not connect to MongoDB:', error.message);
    process.exit(1);
  });
