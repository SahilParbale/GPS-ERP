import fs from 'fs';
import path from 'path';

const screensDir = path.resolve('src', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

console.log(`Checking ${files.length} screen files for obvious undefined identifiers...`);

for (const file of files) {
  const content = fs.readFileSync(path.join(screensDir, file), 'utf8');
  
  // Check INVENTORY_ITEMS
  if (content.includes('INVENTORY_ITEMS') && !content.includes('import') && !content.includes('INVENTORY_ITEMS =')) {
    console.log(`[ALERT] ${file} uses INVENTORY_ITEMS without importing it!`);
  } else if (content.includes('INVENTORY_ITEMS') && !content.match(/import\s+.*INVENTORY_ITEMS.*from/)) {
    console.log(`[ALERT] ${file} uses INVENTORY_ITEMS but might not import it!`);
  }
}
