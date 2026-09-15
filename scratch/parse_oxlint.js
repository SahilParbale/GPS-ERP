import { execSync } from 'child_process';

let jsonStr = '';
try {
  jsonStr = execSync('npx oxlint -D no-undef --format json src/screens', { encoding: 'utf8' });
} catch (e) {
  jsonStr = e.stdout;
}

const parsed = JSON.parse(jsonStr);
console.log('Keys in parsed:', Object.keys(parsed));
if (Array.isArray(parsed)) {
  console.log('Is array with length:', parsed.length);
} else if (parsed.diagnostics) {
  console.log('diagnostics length:', parsed.diagnostics.length);
  const browserGlobals = new Set(['console', 'window', 'document', 'setTimeout', 'clearTimeout', 'localStorage', 'sessionStorage', 'Math', 'Date', 'parseInt', 'parseFloat', 'Number', 'String', 'Boolean', 'URL', 'Blob', 'FileReader', 'Event', 'CustomEvent', 'navigator', 'location', 'history', 'alert', 'confirm', 'prompt', 'fetch', 'Headers', 'Request', 'Response', 'FormData', 'WebSocket', 'Promise', 'Set', 'Map', 'Intl']);

  const realErrors = [];
  for (const d of parsed.diagnostics) {
    if (d.code === 'eslint(no-undef)' || (d.message && d.message.includes('not defined'))) {
      const match = d.message.match(/'([^']+)' is not defined/);
      const varName = match ? match[1] : d.message;
      if (!browserGlobals.has(varName)) {
        realErrors.push({
          file: d.filename,
          varName,
          message: d.message,
          labels: d.labels
        });
      }
    }
  }
  console.log('REAL ERRORS:', realErrors);
}
