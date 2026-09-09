import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.resolve('supabase', 'complete_schema.sql'), 'utf8');

// Count occurrences of $$
let ddCount = 0;
let pos = 0;
while ((pos = sql.indexOf('$$', pos)) !== -1) {
  ddCount++;
  pos += 2;
}

console.log('Total $$ occurrences:', ddCount);
console.log('Is $$ count even?', ddCount % 2 === 0);

// Check if there are any syntax issues with storage.buckets insertion
const hasStorageBuckets = sql.includes('INSERT INTO storage.buckets');
console.log('Has storage.buckets insert:', hasStorageBuckets);

// Check total statements
const statements = sql.split(';').filter(s => s.trim().length > 0);
console.log('Total SQL statements:', statements.length);
