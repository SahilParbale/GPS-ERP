import fs from 'fs';
import path from 'path';

const prefixMap = [
  ['r0000000-', '11111111-'],
  ['sh000000-', '22222222-'],
  ['bay00000-', '33333333-'],
  ['m0000000-', '44444444-'],
  ['mod00000-', '55555555-'],
  ['cust0000-', '66666666-'],
  ['sup00000-', '77777777-'],
  ['spin0000-', '88888888-'],
  ['wo000000-', '99999999-'],
  ['q0000000-', 'aaaaaaaa-'],
  ['so000000-', 'bbbbbbbb-'],
  ['pi000000-', 'cccccccc-'],
  ['inv00000-', 'dddddddd-'],
  ['ewb00000-', 'eeeeeeee-'],
  ['po000000-', 'ffffffff-'],
  ['cat00000-', '10101010-'],
  ['prd00000-', '20202020-'],
  ['wh000000-', '30303030-'],
  ['qc000000-', '40404040-'],
  ['trp00000-', '50505050-'],
  ['veh00000-', '60606060-'],
];

const targetFiles = [
  path.resolve('supabase', 'migrations', '014_seed_data.sql'),
  path.resolve('supabase', 'complete_schema.sql'),
];

for (const file of targetFiles) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let replacements = 0;
  for (const [from, to] of prefixMap) {
    const count = (content.split(from).length - 1);
    if (count > 0) {
      replacements += count;
      content = content.replaceAll(from, to);
    }
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}: replaced ${replacements} occurrences with valid hex UUIDs.`);
}
