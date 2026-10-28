// Pulls the "answer" text out of the model's JSON reply while it is still streaming in,
// so the user sees only the answer words, never the raw JSON around them.
const ESCAPES = { n: '\n', t: '\t', r: '', b: '', f: '', '"': '"', '\\': '\\', '/': '/' };

// Returns a function to feed raw chunks to; onAnswerText gets each new piece of the answer.
function createAnswerStream(onAnswerText) {
  let buffer = '';
  let start = -1;
  let sent = 0;
  let finished = false;

  return function feed(chunk) {
    if (finished) return;
    buffer += chunk;
    if (start < 0) {
      const match = buffer.match(/"answer"\s*:\s*"/);
      if (!match) return;
      start = match.index + match[0].length;
    }

    // Decode the JSON string from the start each time; stop at an unfinished escape and wait for more.
    let text = '';
    for (let i = start; i < buffer.length; i++) {
      const char = buffer[i];
      if (char === '"') {
        finished = true;
        break;
      }
      if (char !== '\\') {
        text += char;
        continue;
      }
      const next = buffer[i + 1];
      if (next === undefined) break;
      if (next === 'u') {
        if (i + 6 > buffer.length) break;
        text += String.fromCharCode(parseInt(buffer.slice(i + 2, i + 6), 16));
        i += 5;
      } else {
        text += ESCAPES[next] ?? next;
        i += 1;
      }
    }

    if (text.length > sent) {
      onAnswerText(text.slice(sent));
      sent = text.length;
    }
  };
}

module.exports = createAnswerStream;
