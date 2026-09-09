/**
 * GPS SPINDLE ERP — DEVELOPMENT SEED USERS PROVISIONER
 * 
 * Provisions the 9 role-based development test accounts directly into Supabase Auth.
 * Uses Supabase Auth Admin API (service_role key from .env.migration).
 * 
 * Usage:
 *   node scripts/create_dev_users.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read service role key from .env.migration
function getEnvConfig() {
  const env = {};
  const migrationPath = path.resolve('.env.migration');
  const envPath = path.resolve('.env');

  if (fs.existsSync(migrationPath)) {
    const raw = fs.readFileSync(migrationPath, 'utf8');
    raw.split('\n').forEach(line => {
      const parts = line.trim().split('=');
      if (parts.length >= 2) env[parts[0]] = parts.slice(1).join('=');
    });
  }

  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split('\n').forEach(line => {
      const parts = line.trim().split('=');
      if (parts.length >= 2 && !env[parts[0]]) env[parts[0]] = parts.slice(1).join('=');
    });
  }

  return env;
}

const env = getEnvConfig();
const url = env.VITE_SUPABASE_URL || 'https://eefqamtethlkqhqgdpah.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required in .env.migration to provision auth users.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEV_USERS_TO_PROVISION = [
  {
    email: 'rahul.patil@gpspindles.com',
    password: 'Password123!',
    role: 'ADMIN',
    fullName: 'Rahul Patil',
    employeeCode: 'GPS-EMP-101'
  },
  {
    email: 'kulkarni.vr@gpspindles.com',
    password: 'Password123!',
    role: 'MANAGEMENT',
    fullName: 'V. R. Kulkarni',
    employeeCode: 'GPS-EMP-100'
  },
  {
    email: 'suresh.sawant@gpspindles.com',
    password: 'Password123!',
    role: 'PROD_MGR',
    fullName: 'Suresh Sawant',
    employeeCode: 'GPS-EMP-103'
  },
  {
    email: 'milind.joshi@gpspindles.com',
    password: 'Password123!',
    role: 'QA_MGR',
    fullName: 'Milind Joshi',
    employeeCode: 'GPS-EMP-102'
  },
  {
    email: 'shreyas.nair@gpspindles.com',
    password: 'Password123!',
    role: 'SALES',
    fullName: 'Shreyas Nair',
    employeeCode: 'GPS-EMP-106'
  },
  {
    email: 'purchase.controller@gpspindles.com',
    password: 'Password123!',
    role: 'PURCHASE',
    fullName: 'Anand Deshmukh',
    employeeCode: 'GPS-EMP-107'
  },
  {
    email: 'dinesh.more@gpspindles.com',
    password: 'Password123!',
    role: 'STORES',
    fullName: 'Dinesh More',
    employeeCode: 'GPS-EMP-105'
  },
  {
    email: 'service.lead@gpspindles.com',
    password: 'Password123!',
    role: 'SERVICE',
    fullName: 'Pramod Jadhav',
    employeeCode: 'GPS-EMP-108'
  },
  {
    email: 'vikram.shinde@gpspindles.com',
    password: 'Password123!',
    role: 'OPERATOR',
    fullName: 'Vikram Shinde',
    employeeCode: 'GPS-EMP-104'
  }
];

async function provision() {
  console.log(`\nConnecting to Supabase Auth: ${url}`);
  console.log(`Provisioning ${DEV_USERS_TO_PROVISION.length} development users...\n`);

  for (const u of DEV_USERS_TO_PROVISION) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          full_name: u.fullName,
          role: u.role,
          employee_code: u.employeeCode,
          is_dev_user: true
        }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          console.log(`[EXISTS]  ${u.role.padEnd(12)}: ${u.email}`);
        } else {
          console.warn(`[FAILED]  ${u.role.padEnd(12)}: ${u.email} — ${error.message}`);
        }
      } else {
        console.log(`[CREATED] ${u.role.padEnd(12)}: ${u.email} (ID: ${data.user.id})`);
      }
    } catch (err) {
      console.error(`[ERROR]   ${u.role}: ${err.message}`);
    }
  }

  console.log('\nDevelopment users provision routine complete.');
}

provision();
