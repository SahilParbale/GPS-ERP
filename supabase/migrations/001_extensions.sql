-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 001_extensions.sql
-- Purpose: Required PostgreSQL extensions for UUID and cryptographic functions
-- ==============================================================================

-- Enable UUID extension for database-generated UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for advanced cryptographic operations and random tokens
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
