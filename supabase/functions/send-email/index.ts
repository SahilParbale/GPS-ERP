// @ts-nocheck
// =============================================================================
// GPS SPINDLE ERP — SUPABASE EDGE FUNCTION: send-email
// File: supabase/functions/send-email/index.ts
// Runtime: Deno (Supabase Edge Functions)
//
// SECURITY CONTRACT:
//   - SMTP credentials, Resend API keys, and service-role key live ONLY in
//     Supabase Function secrets (Deno.env). They are NEVER returned to the
//     caller, logged to email_activity, or exposed in any response field.
//   - Anonymous / unauthenticated requests → 401 UNAUTHORIZED
//   - Valid JWT but wrong role → 403 UNAUTHORIZED
//   - Allowed roles: ADMIN, MANAGEMENT, SALES, PURCHASE
//
// EMAIL LIFECYCLE (per request):
//   begin_email_send RPC (advisory lock) → 'Queued' record created
//     → provider detected
//       → Resend API or SMTP → success  → update to 'Sent'
//                            → failure  → update to 'Failed'
//     → no provider configured          → update to 'Failed'
//       (never left permanently 'Queued')
//
// ATTACHMENT SECURITY:
//   Attachments from the browser are accepted as metadata only (name, size).
//   Binary content is NOT sent by this version — document_ids would be needed
//   to resolve authorized Storage objects server-side. This is documented.
//
// REQUIRED SUPABASE SECRETS (set via `supabase secrets set`):
//   RESEND_API_KEY    → Primary provider (Resend REST API)
//   SMTP_HOST         → Secondary provider (raw SMTP via denomailer)
//   SMTP_PORT         → (optional, default 587)
//   SMTP_USER
//   SMTP_PASSWORD
//   SMTP_FROM_EMAIL
//   SMTP_FROM_NAME
// =============================================================================

declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SendEmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from?: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  document_type?: string;
  document_id?: string;
  customer_name?: string;
  related_customer_id?: string;
  related_supplier_id?: string;
  attachments?: Array<{ name: string; size: string; document_id?: string }>;
  sent_by_name?: string;
  idempotency_key: string;
}

interface BeginEmailSendRow {
  email_activity_id: string;
  is_duplicate: boolean;
  existing_status: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(["ADMIN", "MANAGEMENT", "SALES", "PURCHASE"]);

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Response helpers (no credential data ever included)
// ---------------------------------------------------------------------------
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function errResp(
  status: number,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return jsonResponse({ success: false, error, message, ...extra }, status);
}

// ---------------------------------------------------------------------------
// Sanitize error messages to strip potential credential patterns
// ---------------------------------------------------------------------------
function sanitizeError(raw: string): string {
  return raw
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/password[=:\s]\S+/gi, "password=[REDACTED]")
    .replace(/api[-_]?key[=:\s]\S+/gi, "api_key=[REDACTED]")
    .slice(0, 300);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return errResp(405, "METHOD_NOT_ALLOWED", "Only POST requests are accepted.");
  }

  // ── 1. Extract and validate Authorization header ──────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errResp(401, "UNAUTHORIZED", "Authentication required. Please log in.");
  }
  const jwt = authHeader.slice(7);

  // ── 2. Initialize Supabase clients ────────────────────────────────────────
  const supabaseUrl      = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey  = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    // Server-side log only — never expose to caller
    console.error("[send-email] CRITICAL: Supabase environment vars missing");
    return errResp(500, "SERVER_ERROR", "Server configuration error. Contact support.");
  }

  // Anon client — used only for JWT validation (auth.getUser)
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Service-role client — used for all DB mutations (bypasses RLS safely)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 3. Validate JWT and obtain user identity ──────────────────────────────
  const { data: { user }, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !user) {
    return errResp(401, "UNAUTHORIZED", "Invalid or expired authentication token.");
  }

  // ── 4. Authorise: check user role via profiles + employees tables ─────────
  // roles.code is the authoritative role string (ADMIN, MANAGEMENT, SALES …)
  const [{ data: profileRoleRows }, { data: empRoleRows }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("role_id, roles(code)")
      .eq("id", user.id)
      .limit(1),
    adminClient
      .from("employees")
      .select("role_id, roles(code)")
      .eq("profile_id", user.id)
      .limit(1),
  ]);

  // Extract role codes from either source
  type RoleRow = { roles?: { code?: string } };
  const profileCode = (profileRoleRows as RoleRow[])?.[0]?.roles?.code;
  const empCode     = (empRoleRows as RoleRow[])?.[0]?.roles?.code;
  const userRole    = profileCode || empCode;

  if (!userRole || !ALLOWED_ROLES.has(userRole)) {
    return errResp(403, "UNAUTHORIZED",
      "You are not authorised to send emails from this system.");
  }

  // ── 5. Parse and validate request payload ─────────────────────────────────
  let payload: SendEmailPayload;
  try {
    payload = await req.json() as SendEmailPayload;
  } catch {
    return errResp(400, "INVALID_PAYLOAD", "Request body must be valid JSON.");
  }

  const {
    to, cc, bcc, from: fromAddr, subject, body_text, body_html,
    document_type, document_id, customer_name, related_customer_id,
    related_supplier_id, attachments, sent_by_name, idempotency_key,
  } = payload;

  if (!idempotency_key || typeof idempotency_key !== "string" || !idempotency_key.trim()) {
    return errResp(400, "INVALID_PAYLOAD", "idempotency_key is required.");
  }
  if (!Array.isArray(to) || to.length === 0) {
    return errResp(400, "VALIDATION_ERROR", "At least one 'to' recipient is required.");
  }
  const invalidTo = to.filter((e) => !EMAIL_REGEX.test(String(e).trim()));
  if (invalidTo.length > 0) {
    return errResp(400, "INVALID_RECIPIENT",
      `Invalid email address(es): ${invalidTo.join(", ")}`);
  }
  if (Array.isArray(cc)) {
    const invalidCc = cc.filter((e) => !EMAIL_REGEX.test(String(e).trim()));
    if (invalidCc.length > 0) {
      return errResp(400, "INVALID_RECIPIENT",
        `Invalid CC address(es): ${invalidCc.join(", ")}`);
    }
  }
  if (!subject || String(subject).trim().length === 0) {
    return errResp(400, "VALIDATION_ERROR", "Email subject is required.");
  }

  const cleanTo  = to.map((e) => String(e).trim());
  const cleanCc  = (cc  || []).map((e) => String(e).trim());
  const cleanBcc = (bcc || []).map((e) => String(e).trim());

  // ── 6. Atomic idempotency check + Queued record via advisory-lock RPC ─────
  const { data: beginRows, error: beginErr } = await adminClient.rpc(
    "begin_email_send",
    {
      p_idempotency_key:     idempotency_key,
      p_from_address:        fromAddr || "sales@gpsspindle.com",
      p_to_recipients:       cleanTo,
      p_cc_recipients:       cleanCc,
      p_bcc_recipients:      cleanBcc,
      p_subject:             subject.trim(),
      p_body_text:           body_text || null,
      p_body_html:           body_html || null,
      p_document_type:       document_type || "Quotation",
      p_document_id:         document_id   || "DOC",
      p_related_customer_id: related_customer_id || null,
      p_related_supplier_id: related_supplier_id || null,
      p_customer_name:       customer_name || null,
      p_attachments_count:   Array.isArray(attachments) ? attachments.length : 0,
      p_sent_by:             user.id,
      p_sent_by_name:        sent_by_name || user.email || "ERP User",
      p_metadata: {
        // Attachment metadata only — no binary content; document_ids must be
        // resolved server-side via Storage authorization if binary attach is needed
        attachments: (attachments || []).map((a) => ({
          name: a.name,
          size: a.size,
          has_document_id: !!a.document_id,
        })),
      },
    },
  );

  if (beginErr || !Array.isArray(beginRows) || beginRows.length === 0) {
    console.error("[send-email] begin_email_send RPC error:", beginErr?.message);
    return errResp(500, "SERVER_ERROR",
      "Failed to initialise email send request. Please retry.");
  }

  const { email_activity_id, is_duplicate, existing_status } =
    beginRows[0] as BeginEmailSendRow;

  // ── 7. Idempotent response — already successfully sent ────────────────────
  if (is_duplicate && existing_status === "Sent") {
    return jsonResponse({
      success: true,
      idempotent: true,
      email_activity_id,
      status: "Sent",
      message: "This email was already delivered. Duplicate request acknowledged.",
    });
  }

  // ── 8. Detect email provider from secrets ─────────────────────────────────
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const smtpHost     = Deno.env.get("SMTP_HOST");

  if (!resendApiKey && !smtpHost) {
    // Update to Failed — never leave permanently Queued
    await adminClient
      .from("email_activity")
      .update({
        delivery_status: "Failed",
        metadata: {
          idempotency_key,
          attachments: (attachments || []).map((a) => ({ name: a.name, size: a.size })),
          error_code: "EMAIL_PROVIDER_NOT_CONFIGURED",
          // Sanitized description — no secret values
          error_message:
            "No email provider secrets configured on the server. " +
            "Set RESEND_API_KEY or SMTP_HOST via Supabase secrets.",
          failed_at: new Date().toISOString(),
        },
      })
      .eq("id", email_activity_id);

    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action: "INSERT",
      module: "Commercial",
      table_name: "email_activity",
      record_id: email_activity_id,
      summary_message:
        `Email send failed — provider not configured. ` +
        `Doc: ${document_id || "N/A"}, To: ${cleanTo[0]}`,
    }).catch(() => { /* audit log failure must not crash the response */ });

    return errResp(503, "EMAIL_PROVIDER_NOT_CONFIGURED",
      "Email provider not configured. Please contact your system administrator.",
      { email_activity_id, status: "Failed" },
    );
  }

  // ── 9. Attempt delivery ───────────────────────────────────────────────────
  let providerMessageId = `<gps-${Date.now()}@mail.gpsspindles.com>`;
  let sendError: string | null = null;
  let providerUsed = "none";

  try {
    // ── 9a. Resend API (primary) ──────────────────────────────────────────
    if (resendApiKey) {
      providerUsed = "resend";

      const resendBody: Record<string, unknown> = {
        from: fromAddr || "sales@gpsspindle.com",
        to: cleanTo,
        subject: subject.trim(),
      };
      if (cleanCc.length  > 0) resendBody.cc  = cleanCc;
      if (cleanBcc.length > 0) resendBody.bcc = cleanBcc;

      if (body_html) {
        resendBody.html = body_html;
        if (body_text) resendBody.text = body_text; // optional plain-text fallback
      } else {
        resendBody.text = body_text || "(No message body)";
      }

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          // API key consumed server-side only; never returned to caller
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resendBody),
      });

      if (!resendRes.ok) {
        const errText = await resendRes.text().catch(() => "");
        // Log full error server-side; sanitize before propagating
        console.error(`[send-email] Resend API error ${resendRes.status}:`, errText.slice(0, 500));
        throw new Error(
          `Resend API rejected request (HTTP ${resendRes.status}). Check server logs.`,
        );
      }

      const resendData = await resendRes.json() as { id?: string };
      if (resendData.id) {
        providerMessageId = `resend:${resendData.id}`;
      }

    // ── 9b. SMTP via denomailer (secondary) ───────────────────────────────
    } else if (smtpHost) {
      providerUsed = "smtp";

      const smtpPort      = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
      const smtpUser      = Deno.env.get("SMTP_USER")       ?? "";
      const smtpPassword  = Deno.env.get("SMTP_PASSWORD")   ?? "";
      const smtpFromEmail = Deno.env.get("SMTP_FROM_EMAIL") || fromAddr || "sales@gpsspindle.com";
      const smtpFromName  = Deno.env.get("SMTP_FROM_NAME")  || "General Precision Spindles";

      // Dynamic import — only loaded when SMTP is configured
      const { SmtpClient } = await import(
        "https://deno.land/x/denomailer@1.6.0/mod.ts"
      );
      const client = new SmtpClient({ debug: false });

      await client.connectTLS({
        hostname: smtpHost,
        port: smtpPort,
        username: smtpUser,
        password: smtpPassword,  // credential used server-side; never returned
      });

      await client.send({
        from: `${smtpFromName} <${smtpFromEmail}>`,
        to: cleanTo.join(", "),
        cc: cleanCc.length > 0 ? cleanCc.join(", ") : undefined,
        subject: subject.trim(),
        content: body_text || "Please see the document referenced in this email.",
        html: body_html || undefined,
      });

      await client.close();
    }
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    sendError = sanitizeError(rawMsg);
    console.error("[send-email] Provider error:", rawMsg.slice(0, 500));
  }

  // ── 10. Update email_activity — Sent or Failed (never left Queued) ────────
  if (sendError) {
    await adminClient
      .from("email_activity")
      .update({
        delivery_status: "Failed",
        metadata: {
          idempotency_key,
          attachments: (attachments || []).map((a) => ({ name: a.name, size: a.size })),
          error_code:    "EMAIL_SEND_FAILED",
          error_message: sendError,  // already sanitized above
          provider:      providerUsed,
          failed_at:     new Date().toISOString(),
        },
      })
      .eq("id", email_activity_id);

    await adminClient.from("audit_logs").insert({
      user_id:  user.id,
      user_email: user.email,
      action:   "INSERT",
      module:   "Commercial",
      table_name: "email_activity",
      record_id:  email_activity_id,
      summary_message:
        `Email delivery FAILED via ${providerUsed}. ` +
        `Doc: ${document_id || "N/A"}, To: ${cleanTo[0]}`,
    }).catch(() => {});

    return errResp(502, "PROVIDER_REJECTION",
      "Email delivery failed. Please retry.",
      { email_activity_id, status: "Failed" },
    );
  }

  // ── 11. Success — update to Sent ──────────────────────────────────────────
  await adminClient
    .from("email_activity")
    .update({
      delivery_status: "Sent",
      message_id:      providerMessageId,
      metadata: {
        idempotency_key,
        attachments: (attachments || []).map((a) => ({ name: a.name, size: a.size })),
        provider: providerUsed,
        sent_at:  new Date().toISOString(),
      },
    })
    .eq("id", email_activity_id);

  await adminClient.from("audit_logs").insert({
    user_id:  user.id,
    user_email: user.email,
    action:   "INSERT",
    module:   "Commercial",
    table_name: "email_activity",
    record_id:  email_activity_id,
    summary_message:
      `Email sent via ${providerUsed}. ` +
      `Doc: ${document_id || "N/A"}, To: ${cleanTo.join(", ")}`,
  }).catch(() => {});

  return jsonResponse({
    success:           true,
    email_activity_id,
    message_id:        providerMessageId,
    status:            "Sent",
    provider:          providerUsed,
  });
});

