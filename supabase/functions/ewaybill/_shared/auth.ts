// @ts-nocheck
// =============================================================================
// GPS SPINDLE ERP — NIC E-WAY BILL AUTHENTICATION & SESSION MANAGER
// File: supabase/functions/ewaybill/_shared/auth.ts
// =============================================================================

import { generateAppKey, rsaEncrypt, aesEcbDecrypt } from "./crypto.ts";

declare const Deno: any;

export interface EwbSession {
  authToken: string;
  sek: Buffer; // Decrypted Session Encryption Key (32 bytes)
  expiresAt: number;
}

export interface NicConfig {
  env: "PREPROD" | "PROD";
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  gstin: string;
  publicKeyPem: string;
  isConfigured: boolean;
}

// In-memory token cache (persists across warm Edge Function invocations)
let cachedSession: EwbSession | null = null;

/**
 * Resolves current NIC environment and credentials from Supabase secrets
 */
export function getNicConfig(): NicConfig {
  const envRaw = (Deno.env.get("EWB_ENV") || "PREPROD").toUpperCase();
  const env: "PREPROD" | "PROD" = envRaw === "PROD" || envRaw === "PRODUCTION" ? "PROD" : "PREPROD";

  const baseUrl = env === "PROD"
    ? "https://ewaybillgst.gov.in"
    : "https://gstepg.ewaybillgst.gov.in";

  const clientId = Deno.env.get("EWB_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("EWB_CLIENT_SECRET") || "";
  const username = Deno.env.get("EWB_USERNAME") || "";
  const password = Deno.env.get("EWB_PASSWORD") || "";
  const gstin = Deno.env.get("EWB_GSTIN") || "27AABCG1492K1Z8";
  const publicKeyPem = Deno.env.get("EWB_PUBLIC_KEY") || "";

  const isConfigured = Boolean(
    clientId && clientSecret && username && password && publicKeyPem
  );

  return {
    env,
    baseUrl,
    clientId,
    clientSecret,
    username,
    password,
    gstin,
    publicKeyPem,
    isConfigured,
  };
}

/**
 * Authenticates against official NIC API v1.03 or returns cached session
 */
export async function getNicAuthSession(config: NicConfig): Promise<{
  success: boolean;
  session?: EwbSession;
  error?: string;
  statusCode?: number;
}> {
  if (!config.isConfigured) {
    return {
      success: false,
      error: "NIC E-Way Bill integration is not configured. Official credentials (EWB_CLIENT_ID, EWB_CLIENT_SECRET, EWB_USERNAME, EWB_PASSWORD, EWB_PUBLIC_KEY) are required.",
      statusCode: 503,
    };
  }

  // Check if existing token is valid (with 5 min safety buffer)
  const now = Date.now();
  if (cachedSession && cachedSession.expiresAt > now + 300000) {
    return { success: true, session: cachedSession };
  }

  try {
    // 1. Generate 32-byte app_key
    const appKeyBuffer = generateAppKey();

    // 2. RSA Encrypt app_key and password
    const encAppKey = rsaEncrypt(appKeyBuffer, config.publicKeyPem);
    const encPassword = rsaEncrypt(config.password, config.publicKeyPem);

    // 3. Dispatch auth handshake
    const authUrl = `${config.baseUrl}/ewaybillapi/v1.03/auth`;
    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "client-id": config.clientId,
        "client-secret": config.clientSecret,
        "Gstin": config.gstin,
      },
      body: JSON.stringify({
        action: "ACCESSTOKEN",
        username: config.username,
        password: encPassword,
        app_key: encAppKey,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `NIC Authentication Gateway returned HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        statusCode: response.status,
      };
    }

    const resJson = await response.json();

    if (resJson.status === 0 || !resJson.data) {
      const errMsg = resJson.errorCodes || resJson.message || "NIC authentication rejected credentials";
      return {
        success: false,
        error: `NIC Authentication Error: ${errMsg}`,
        statusCode: 400,
      };
    }

    // 4. Decrypt SEK using app_key
    const encryptedSekBase64 = resJson.data.sek;
    const decryptedSekString = aesEcbDecrypt(encryptedSekBase64, appKeyBuffer);
    const decryptedSekBuffer = Buffer.from(decryptedSekString, "base64");

    const session: EwbSession = {
      authToken: resJson.data.authtoken,
      sek: decryptedSekBuffer,
      expiresAt: now + (350 * 60 * 1000), // 350 minutes
    };

    cachedSession = session;
    return { success: true, session };
  } catch (err: any) {
    return {
      success: false,
      error: `NIC Cryptographic/Network Handshake Exception: ${err.message}`,
      statusCode: 502,
    };
  }
}
