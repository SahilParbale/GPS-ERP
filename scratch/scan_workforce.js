import fs from 'fs';

const content = fs.readFileSync('src/screens/WorkforceScreen.jsx', 'utf8');
const lines = content.split('\n');

console.log('--- Checking toLowerCase calls in WorkforceScreen.jsx ---');
lines.forEach((line, idx) => {
  if (line.includes('toLowerCase()')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});

console.log('--- Checking includes calls in WorkforceScreen.jsx ---');
lines.forEach((line, idx) => {
  if (line.includes('.includes(') && (line.includes('status') || line.includes('role') || line.includes('dept') || line.includes('shift'))) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
