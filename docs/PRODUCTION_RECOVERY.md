# GPS SPINDLE ERP — PRODUCTION BACKUP & RECOVERY READINESS GUIDE

**Document Version:** 1.0.0  
**Phase:** Phase 10 Production Hardening & Audit  
**Classification:** Internal Confidential / Operational Runbook  
**Last Audited:** 2026-09-11  

---

## 1. PURPOSE & SCOPE

This document outlines the standard operating procedures (SOP), recovery strategies, and operational responsibilities for disaster recovery, database restoration, object storage failover, and release rollbacks for the GPS Spindle ERP platform.

---

## 2. BACKUP CONFIGURATION & VERIFICATION STATUS

> [!WARNING]
> **Cloud Backup Verification Notice:**  
> In accordance with Phase 10 strict audit rules, automated cloud backups on the live Supabase hosted project (`https://eefqamtethlkqhqgdpah.supabase.co`) cannot be programmatically verified via client/REST APIs without Supabase Management API access tokens.  
> **Status: VERIFICATION REQUIRED VIA SUPABASE DASHBOARD.**

### 2.1 Hosted Supabase Automated Backups
1. **Daily Snapshots (Pro Tier):**
   - Stored in Supabase multi-region S3-compatible infrastructure.
   - 7-day retention period for standard Pro projects; 30-day retention for enterprise configurations.
   - Frequency: Daily automated execution at 00:00 UTC.
2. **Point-in-Time Recovery (PITR):**
   - Recommended for high-frequency ERP manufacturing operations.
   - Allows restoration down to the second within the retention window using write-ahead logs (WAL).
   - **Action Item:** Verify in Supabase Project Settings -> Database -> Backups.

### 2.2 Manual Offline Export Strategy (Run Weekly / Pre-Release)
Run the automated schema and data dump utility using the Supabase CLI:

```bash
# Dump Full Database Schema (DDL + Constraints + Policies)
supabase db dump --project-ref eefqamtethlkqhqgdpah -f backups/gps_erp_schema_$(date +%Y%m%d).sql

# Dump Production Data (DML - Excluding audit trails if archiving separately)
supabase db dump --project-ref eefqamtethlkqhqgdpah --data-only -f backups/gps_erp_data_$(date +%Y%m%d).sql

# Encrypt backup before storing in offline cold storage
gpg --symmetric --cipher-algo AES256 backups/gps_erp_data_$(date +%Y%m%d).sql
```

---

## 3. DATABASE RECOVERY STRATEGIES

### Scenario A: Accidental Data Corruption / Deletion (Targeted Table Recovery)
If an unauthorized or accidental modification occurs on key operational tables (`spindles`, `work_orders`, `stock`):
1. **Locate Time of Corruption:** Consult `audit_logs` table:
   ```sql
   SELECT created_at, user_id, action, table_name, old_data, new_data 
   FROM audit_logs 
   WHERE table_name = 'work_orders' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
2. **Restore Historical Row State:**
   Use the immutable `old_data` JSONB payload stored in `audit_logs` to restore the exact pre-mutation state.

### Scenario B: Catastrophic Infrastructure Failure (Full Project Restore)
1. **Provision New Database / Project:**
   If the primary region or project becomes unreachable, provision a replacement instance.
2. **Apply Migrations in Deterministic Sequence:**
   Apply `supabase/complete_schema.sql` (or numbered migrations `001_extensions.sql` through `021_inventory_atomic_mutation.sql`).
3. **Restore Verified Baseline Master Data:**
   Execute:
   ```bash
   node scripts/migrate_master_data.js
   node scripts/create_dev_users.js
   ```
4. **Restore Incremental Business Data:**
   Import the most recent verified encrypted PostgreSQL dump file.
5. **Verify Security Posture:**
   Immediately execute:
   ```bash
   node scripts/verify_phase4_live.js
   node scripts/phase10_audit.js
   ```

---

## 4. STORAGE OBJECT RECOVERY & SYNCHRONIZATION

The ERP utilizes 4 distinct buckets with strict authorization policies:
1. `spindle-documents` (Private)
2. `quality-reports` (Private)
3. `invoices-ewb` (Private)
4. `avatars` (Public)

### Storage Backup Procedure
Object storage assets must be replicated weekly to secondary cloud storage (AWS S3 / Cloudflare R2 / Azure Blob):
```bash
# Export metadata table
supabase db dump --table documents --table document_versions -f backups/documents_metadata.sql

# Sync storage files via script or AWS CLI s3 sync
aws s3 sync s3://supabase-spindle-documents s3://gps-cold-storage-documents/spindle-documents/ --delete
```

---

## 5. APPLICATION RELEASE ROLLBACK PROCEDURE

### Zero-Downtime Rollback Workflow (Frontend / Vite)
1. **Frontend Deployment (Vercel / Netlify / Cloudflare Pages / Docker):**
   - Keep previous release build artifacts (`dist/` packages) tagged by git commit SHA.
   - In case of an unexpected regression, trigger instant rollback to previous commit in deployment provider dashboard (< 30 seconds).
2. **Database Backward Compatibility Rule:**
   - All migrations must adhere to **Expand-Contract** principles.
   - Column deletions or renames must be preceded by a deprecated period.
   - New constraints must NOT fail existing legitimate production data.

---

## 6. DISASTER RECOVERY ROLES & CONTACTS

| Role | Responsibility | Designation |
| :--- | :--- | :--- |
| **Recovery Incident Commander** | Overall disaster coordination & approvals | VP Operations / IT Director |
| **Database Administrator (DBA)** | PITR execution, dump restorations, integrity checks | Lead Backend Engineer |
| **Infrastructure Lead** | DNS failover, storage sync, secret rotations | DevOps Engineer |
| **Domain QA Lead** | Post-recovery smoke tests across all 9 roles | Quality Lead |

---

## 7. RECOVERY TIME & POINT OBJECTIVES (RTO / RPO)

- **Recovery Point Objective (RPO):** Maximum acceptable data loss = **1 hour** (with automated PITR active: < 5 minutes).
- **Recovery Time Objective (RTO):** Maximum acceptable downtime = **2 hours** for full system rebuild; **15 minutes** for frontend rollbacks.
