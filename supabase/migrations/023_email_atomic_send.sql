-- ==============================================================================
-- GPS SPINDLE ERP — EMAIL DELIVERY ATOMIC SEND RPC
-- Migration: 023_email_atomic_send.sql
-- Purpose:  Atomic idempotency check + email_activity creation using
--           PostgreSQL advisory transaction locks to prevent race conditions
--           in concurrent email dispatch requests.
-- ==============================================================================

-- begin_email_send
-- ─────────────────────────────────────────────────────────────────────────────
-- Atomically checks whether a Sent record already exists for the given
-- idempotency_key. If one exists, returns is_duplicate = TRUE so the caller
-- can return the existing result without re-sending. Otherwise inserts a new
-- email_activity row with delivery_status = 'Queued' and returns its ID.
--
-- Advisory lock strategy:
--   pg_advisory_xact_lock(hashtext(idempotency_key)::BIGINT)
--   → serialises concurrent calls for the same key within the current
--     transaction; automatically released on transaction commit/rollback.
--
-- Retry semantics:
--   'Sent'   → blocked (idempotent — already delivered)
--   'Failed' → allowed (provider failed; caller may retry)
--   'Queued' → allowed (orphaned in-flight; caller creates fresh attempt)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.begin_email_send(
    p_idempotency_key     TEXT,
    p_from_address        TEXT     DEFAULT 'sales@gpsspindle.com',
    p_to_recipients       TEXT[]   DEFAULT ARRAY[]::TEXT[],
    p_cc_recipients       TEXT[]   DEFAULT ARRAY[]::TEXT[],
    p_bcc_recipients      TEXT[]   DEFAULT ARRAY[]::TEXT[],
    p_subject             TEXT     DEFAULT '',
    p_body_text           TEXT     DEFAULT NULL,
    p_body_html           TEXT     DEFAULT NULL,
    p_document_type       TEXT     DEFAULT 'Quotation',
    p_document_id         TEXT     DEFAULT 'DOC',
    p_related_customer_id UUID     DEFAULT NULL,
    p_related_supplier_id UUID     DEFAULT NULL,
    p_customer_name       TEXT     DEFAULT NULL,
    p_attachments_count   INT      DEFAULT 0,
    p_sent_by             UUID     DEFAULT NULL,
    p_sent_by_name        TEXT     DEFAULT 'ERP User',
    p_metadata            JSONB    DEFAULT '{}'::JSONB
)
RETURNS TABLE(
    email_activity_id UUID,
    is_duplicate      BOOLEAN,
    existing_status   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id     UUID;
    v_existing_status TEXT;
    v_new_id          UUID;
    v_message_id      TEXT;
BEGIN
    -- Input guards (fail fast before acquiring the lock)
    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION 'idempotency_key must be a non-empty string';
    END IF;
    IF array_length(p_to_recipients, 1) IS NULL THEN
        RAISE EXCEPTION 'to_recipients must not be empty';
    END IF;
    IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
        RAISE EXCEPTION 'subject must be a non-empty string';
    END IF;

    -- Acquire advisory transaction-scoped lock.
    -- All concurrent calls with the same idempotency_key will queue here.
    -- Lock is automatically released when this transaction ends.
    PERFORM pg_advisory_xact_lock(hashtext(p_idempotency_key)::BIGINT);

    -- Check for an existing SUCCESSFULLY SENT record only.
    -- 'Failed' and 'Queued' records do NOT block a retry attempt.
    SELECT ea.id, ea.delivery_status
      INTO v_existing_id, v_existing_status
      FROM public.email_activity ea
     WHERE ea.metadata->>'idempotency_key' = p_idempotency_key
       AND ea.delivery_status = 'Sent'
     ORDER BY ea.sent_at DESC
     LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Email was already successfully delivered. Signal the caller.
        RETURN QUERY SELECT v_existing_id, TRUE, v_existing_status;
        RETURN;
    END IF;

    -- Build a unique per-attempt message-id for tracking purposes.
    v_message_id := '<gps-'
        || (EXTRACT(EPOCH FROM clock_timestamp())::BIGINT)::TEXT
        || '-'
        || replace(gen_random_uuid()::TEXT, '-', '')
        || '@mail.gpsspindles.com>';

    -- Insert new Queued record.
    -- The Supabase Edge Function MUST update this to 'Sent' or 'Failed'
    -- before returning. A record is NEVER left permanently at 'Queued'.
    INSERT INTO public.email_activity (
        message_id,
        from_address,
        to_recipients,
        cc_recipients,
        bcc_recipients,
        subject,
        body_text,
        body_html,
        document_type,
        document_id,
        related_customer_id,
        related_supplier_id,
        customer_name,
        attachments_count,
        delivery_status,
        sent_by,
        sent_by_name,
        sent_at,
        metadata
    ) VALUES (
        v_message_id,
        p_from_address,
        p_to_recipients,
        COALESCE(p_cc_recipients,  ARRAY[]::TEXT[]),
        COALESCE(p_bcc_recipients, ARRAY[]::TEXT[]),
        p_subject,
        p_body_text,
        p_body_html,
        p_document_type,
        p_document_id,
        p_related_customer_id,
        p_related_supplier_id,
        p_customer_name,
        COALESCE(p_attachments_count, 0),
        'Queued',
        p_sent_by,
        p_sent_by_name,
        clock_timestamp(),
        -- Merge caller metadata with idempotency_key so future lookups are reliable
        COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object('idempotency_key', p_idempotency_key)
    )
    RETURNING id INTO v_new_id;

    RETURN QUERY SELECT v_new_id, FALSE, 'Queued'::TEXT;
END;
$$;

-- Explicit grants so both the Edge Function service role and authenticated
-- sessions can call this RPC via PostgREST.
GRANT EXECUTE ON FUNCTION public.begin_email_send TO authenticated;
GRANT EXECUTE ON FUNCTION public.begin_email_send TO service_role;

-- Partial index for fast idempotency lookups (only Sent records matter).
-- Avoids a full seq-scan on email_activity for every send request.
CREATE INDEX IF NOT EXISTS idx_email_idempotency_sent
    ON public.email_activity ((metadata->>'idempotency_key'))
    WHERE delivery_status = 'Sent';

