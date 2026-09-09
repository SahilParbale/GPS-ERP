import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.resolve('supabase', 'complete_schema.sql'), 'utf8');
const tableCols = {};
const lines = sql.split('\n');
let currentTable = null;
let inTable = false;

for (const line of lines) {
  const trimmed = line.trim();
  const createMatch = trimmed.match(/^CREATE TABLE IF NOT EXISTS public\.([a-zA-Z0-9_]+)\s*\(/i);
  if (createMatch) {
    currentTable = createMatch[1];
    tableCols[currentTable] = [];
    inTable = true;
    continue;
  }
  if (inTable) {
    if (trimmed.startsWith(');')) {
      inTable = false;
      currentTable = null;
      continue;
    }
    if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('PRIMARY KEY') && !trimmed.startsWith('UNIQUE') && !trimmed.startsWith('CHECK')) {
      const colName = trimmed.split(/\s+/)[0].replace(/[",]/g, '');
      if (colName && currentTable) {
        tableCols[currentTable].push(colName);
      }
    }
  }
}

console.log('Total tables identified:', Object.keys(tableCols).length);
const rows = [];
for (const [table, cols] of Object.entries(tableCols)) {
  const ownership = cols.filter(c => [
    'employee_id', 'created_by', 'assigned_to', 'owner_id', 
    'requested_by', 'approved_by', 'technician_id', 'inspector_id', 
    'user_id', 'performed_by', 'operator_id', 'department_id', 'customer_id', 'supplier_id'
  ].includes(c));
  rows.push({ table, colCount: cols.length, ownership: ownership.join(', ') || 'None' });
}

console.table(rows);
