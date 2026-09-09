import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.resolve('supabase', 'complete_schema.sql'), 'utf8');

// Parse CREATE TABLE columns
const tableCols = {};
const lines = sql.split('\n');
let currentTable = null;
let inTable = false;

for (const line of lines) {
  const trimmed = line.trim();
  const createMatch = trimmed.match(/^CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)\s*\(/i);
  if (createMatch) {
    currentTable = createMatch[1];
    tableCols[currentTable] = new Set();
    inTable = true;
    continue;
  }
  if (inTable) {
    if (trimmed.startsWith(');')) {
      inTable = false;
      currentTable = null;
      continue;
    }
    // Extract column name
    if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('PRIMARY KEY') && !trimmed.startsWith('UNIQUE') && !trimmed.startsWith('CHECK')) {
      const colName = trimmed.split(/\s+/)[0].replace(/[",]/g, '');
      if (colName && currentTable) {
        tableCols[currentTable].add(colName);
      }
    }
  }
}

// Parse INSERT INTO statements
const insertRegex = /INSERT INTO public\.([a-zA-Z0-9_]+)\s*\(([^)]+)\)/gi;
let match;
const errors = [];
let insertCount = 0;

while ((match = insertRegex.exec(sql)) !== null) {
  insertCount++;
  const table = match[1];
  const cols = match[2].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
  if (!tableCols[table]) {
    errors.push(`Table not found for INSERT: ${table}`);
    continue;
  }
  for (const c of cols) {
    if (!tableCols[table].has(c)) {
      errors.push(`Column '${c}' not defined in table '${table}'`);
    }
  }
}

console.log(`Inspected ${insertCount} INSERT statements across ${Object.keys(tableCols).length} tables.`);
if (errors.length > 0) {
  console.error('Column mismatches found:', errors);
  process.exit(1);
} else {
  console.log('SUCCESS: All INSERT statement columns 100% matched to table definitions!');
}
