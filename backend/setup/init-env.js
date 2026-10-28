// Creates backend/.env from .env.example: generates JWT_SECRET, asks for the MongoDB URI and Groq key, adds the test DB URI.
// Values already set are kept, so it's safe to re-run. Run with: make env (or npm run init-env)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline/promises');

const root = path.join(__dirname, '..', '..');
const examplePath = path.join(root, '.env.example');
const envPath = path.join(__dirname, '..', '.env');

function parse(text) {
  const values = {};
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

// mongodb+srv://u:p@host/patient_management?x=y  ->  mongodb+srv://u:p@host/patient_management_test?x=y
function testUriFrom(uri) {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(.*)$/);
  if (!match) return '';
  return `${match[1]}${match[2] || 'patient_management'}_test${match[3]}`;
}

async function main() {
  const current = fs.existsSync(envPath) ? parse(fs.readFileSync(envPath, 'utf8')) : {};
  const values = { ...current };

  if (!values.JWT_SECRET) values.JWT_SECRET = crypto.randomBytes(32).toString('hex');

  if (process.stdin.isTTY && (!values.MONGO_URI || !values.GROQ_API_KEY)) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!values.MONGO_URI) {
      values.MONGO_URI = (await rl.question('MongoDB URI (include the database name, e.g. ...mongodb.net/patient_management): ')).trim();
    }
    if (!values.GROQ_API_KEY) {
      values.GROQ_API_KEY = (await rl.question('Groq API key (https://console.groq.com/keys, Enter to skip): ')).trim();
    }
    rl.close();
  }
  if (!values.MONGO_URI_TEST && values.MONGO_URI) values.MONGO_URI_TEST = testUriFrom(values.MONGO_URI);

  // Keep the layout and comments of .env.example, filling in each value.
  const output = fs
    .readFileSync(examplePath, 'utf8')
    .split('\n')
    .map((line) => {
      const match = line.match(/^([A-Z_]+)=/);
      return match ? `${match[1]}=${values[match[1]] || ''}` : line;
    })
    .join('\n');
  fs.writeFileSync(envPath, output);

  console.log(`backend/.env ready${values.MONGO_URI ? '' : ' (MONGO_URI is still empty: add it before "make db")'}`);
  if (!values.GROQ_API_KEY) console.log('GROQ_API_KEY is empty: the app works, but the AI assistant will be off until you add it.');
}

main().catch((error) => {
  console.error('Could not create backend/.env:', error.message);
  process.exit(1);
});
