import fs from 'fs';
import path from 'path';

const migrationsDir = path.resolve('supabase', 'migrations');
const outputFile = path.resolve('supabase', 'complete_schema.sql');

const files = [
  '001_extensions.sql',
  '002_organization.sql',
  '003_workforce.sql',
  '004_manufacturing.sql',
  '005_spindles.sql',
  '006_quality.sql',
  '007_commercial.sql',
  '008_procurement.sql',
  '009_inventory.sql',
  '010_service_assets.sql',
  '011_logistics_finance.sql',
  '012_documents_notifications.sql',
  '013_audit_triggers.sql',
  '014_seed_data.sql'
];

let concatenated = `-- ==============================================================================
-- GPS SPINDLE ERP — COMPLETE RELATIONAL DATABASE ARCHITECTURE & SEED
-- Platform: Supabase PostgreSQL
-- Generated for: GPS Spindle Precision Manufacturing ERP
-- Version: 2.0 (Phase 2 Database Architecture)
-- ==============================================================================

`;

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    concatenated += `\n-- >>> START: ${file} <<<\n\n` + content + `\n\n-- >>> END: ${file} <<<\n\n`;
  } else {
    console.warn(`Warning: File not found: ${filePath}`);
  }
}

fs.writeFileSync(outputFile, concatenated, 'utf-8');
console.log(`Successfully generated ${outputFile} (${concatenated.length} bytes) from ${files.length} migration modules.`);
