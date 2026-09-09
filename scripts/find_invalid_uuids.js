import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.resolve('supabase', 'complete_schema.sql'), 'utf8');

// Match 8-4-4-4-12 pattern enclosed in quotes
const uuidRegex = /'([0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12})'/g;
const hexRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

let match;
const invalid = new Set();
while ((match = uuidRegex.exec(sql)) !== null) {
  const candidate = match[1];
  if (!hexRegex.test(candidate)) {
    invalid.add(candidate);
  }
}

console.log('Total invalid UUIDs found:', invalid.size);
console.log('Invalid UUIDs list:', Array.from(invalid));
