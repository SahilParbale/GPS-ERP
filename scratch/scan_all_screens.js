import fs from 'fs';
import path from 'path';

const screensDir = path.resolve('src', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

const dataExports = [
  'WORK_ORDERS', 'SPINDLES', 'CUSTOMERS', 'CONTACTS', 'SUPPLIERS',
  'INVOICES', 'PURCHASE_ORDERS', 'PROFORMA_INVOICES', 'EWAY_BILLS',
  'INVENTORY_ITEMS', 'SERVICES_DATA', 'QUALITY_RECORDS', 'AUDIT_TRAIL',
  'SYSTEM_NOTIFICATIONS', 'EMAIL_LOGS', 'REPORTS_CATALOG', 'DASHBOARD_METRICS',
  'INITIAL_WORKFORCE_STAFF', 'INITIAL_WORKFORCE_KPIS', 'INITIAL_ACTIVITY_FEED',
  'INITIAL_DEPARTMENTS_WORKLOAD', 'INITIAL_WORKFORCE_ALERTS', 'INITIAL_SHIFT_SUMMARY'
];

for (const file of files) {
  const content = fs.readFileSync(path.join(screensDir, file), 'utf8');
  
  for (const exp of dataExports) {
    const usageRegex = new RegExp(`\\b${exp}\\b`, 'g');
    const matches = content.match(usageRegex);
    if (matches) {
      // Check if it's imported specifically
      const importRegex = new RegExp(`import\\s+[^;]*\\b${exp}\\b[^;]*from`, 's');
      const isImported = importRegex.test(content);
      const isDefined = new RegExp(`(const|let|var|function)\\s+${exp}\\b`).test(content);
      
      if (!isImported && !isDefined) {
        console.log(`[UNDEFINED VARIABLE] ${file} uses ${exp} (${matches.length} times) but does NOT import or define it!`);
      }
    }
  }
}
console.log('Done scanning.');
