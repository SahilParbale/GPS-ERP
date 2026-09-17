import fs from 'fs';
import path from 'path';

const screensDir = path.resolve('src', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.jsx'));

console.log('=== SCREEN AUDIT: LIVE DATABASE VS MOCK DATA ===\n');

for (const file of files) {
  const content = fs.readFileSync(path.join(screensDir, file), 'utf8');
  
  const hasDbService = /from\s+['"].*services\/database\/.*['"]/.test(content);
  const dbServices = [...content.matchAll(/import\s+{?([^}]+)}?\s+from\s+['"].*services\/database\/([^'"]+)['"]/g)].map(m => m[2]);
  
  const hasMockData = /from\s+['"].*data\/.*mockData.*['"]/.test(content);
  const mockImports = [...content.matchAll(/import\s+{?([^}]+)}?\s+from\s+['"].*data\/.*mockData.*['"]/g)].map(m => m[1].replace(/\s+/g, ' ').trim());

  const hasWorkforceData = /from\s+['"].*data\/workforceData.*['"]/.test(content);

  console.log(`[${file}]`);
  console.log(`  DB Connected: ${hasDbService ? 'YES (' + dbServices.join(', ') + ')' : 'NO'}`);
  console.log(`  Uses Mock Data: ${hasMockData ? 'YES (' + mockImports.join(', ') + ')' : 'NO'}`);
  if (hasWorkforceData) console.log(`  Uses Workforce Mock: YES`);
  console.log('');
}
