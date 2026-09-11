import fs from 'fs';
import path from 'path';

const sql = fs.readFileSync(path.resolve('supabase', 'complete_schema.sql'), 'utf8');

// A tokenizer for SQL VALUES list
function countTupleExpressions(tupleStr) {
  let inString = false;
  let inArray = 0;
  let parenDepth = 0;
  let count = 1;

  for (let i = 0; i < tupleStr.length; i++) {
    const char = tupleStr[i];

    if (char === "'" && tupleStr[i - 1] !== '\\') {
      inString = !inString;
    } else if (!inString) {
      if (char === '[' || (char === '(' && tupleStr.slice(Math.max(0, i - 5), i).toUpperCase().includes('ARRAY'))) {
        inArray++;
      } else if (char === ']' || (char === ')' && inArray > 0)) {
        inArray--;
      } else if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === ',' && !inArray && parenDepth === 0) {
        count++;
      }
    }
  }

  return count;
}

const lines = sql.split('\n');
const errors = [];

let currentTable = null;
let expectedCols = 0;
let colNames = [];
let insertStartLine = 0;

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  const trimmed = line.trim();

  // Match INSERT INTO
  const insertMatch = trimmed.match(/^INSERT INTO public\.([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES/i);
  if (insertMatch) {
    currentTable = insertMatch[1];
    colNames = insertMatch[2].split(',').map(c => c.trim().replace(/"/g, ''));
    expectedCols = colNames.length;
    insertStartLine = lineIdx + 1;
    continue;
  }

  if (currentTable) {
    if (trimmed.startsWith('ON CONFLICT') || trimmed === ';' || (trimmed.endsWith(';') && !trimmed.startsWith('('))) {
      currentTable = null;
      continue;
    }

    if (trimmed.startsWith('(')) {
      // Find the closing paren of this tuple
      // Tuple might end with comma or semicolon or ON CONFLICT
      let tupleContent = trimmed;
      // Strip leading (
      tupleContent = tupleContent.slice(1);
      // Strip trailing ), or ); or )
      if (tupleContent.endsWith('),')) tupleContent = tupleContent.slice(0, -2);
      else if (tupleContent.endsWith(');')) tupleContent = tupleContent.slice(0, -2);
      else if (tupleContent.endsWith(')')) tupleContent = tupleContent.slice(0, -1);

      const actualCount = countTupleExpressions(tupleContent);
      if (actualCount !== expectedCols) {
        errors.push({
          line: lineIdx + 1,
          table: currentTable,
          expectedCols,
          actualCount,
          colNames,
          sample: trimmed.slice(0, 100) + '...'
        });
      }
    }

    if (trimmed.endsWith(';')) {
      currentTable = null;
    }
  }
}

console.log(`Validation complete. Found ${errors.length} tuple length mismatches:`);
for (const err of errors) {
  console.log(`Line ${err.line} [Table: ${err.table}]: Expected ${err.expectedCols} columns, found ${err.actualCount} expressions.`);
  console.log(`  Columns: ${err.colNames.join(', ')}`);
  console.log(`  Row sample: ${err.sample}\n`);
}
