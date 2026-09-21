// @ts-nocheck
// =============================================================================
// GPS SPINDLE ERP — NIC E-WAY BILL CRYPTOGRAPHY ENGINE (v1.03)
// File: supabase/functions/ewaybill/_shared/crypto.ts
// Runtime: Deno / Node compatible
//
// NIC v1.03 SPECIFICATION:
// 1. Authentication Handshake:
//    - app_key: 32-byte cryptographically secure random key
//    - Encrypted using NIC RSA Public Key with PKCS#1 v1.5 padding
//    - Password encrypted using NIC RSA Public Key with PKCS#1 v1.5 padding
// 2. Session Key Decryption:
//    - Returned SEK is decrypted using app_key with AES-256-ECB
// 3. Payload Encryption & Decryption:
//    - Request JSON payload encrypted using decrypted SEK with AES-256-ECB (PKCS#7)
//    - Response JSON payload decrypted using decrypted SEK with AES-256-ECB
// =============================================================================

import crypto from "node:crypto";

/**
 * Generates a 32-byte (256-bit) cryptographically secure random key
 */
export function generateAppKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Encrypts data using RSA Public Key with PKCS#1 v1.5 padding
 */
export function rsaEncrypt(data: string | Buffer, publicKeyPem: string): string {
  const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  );
  return encrypted.toString("base64");
}

/**
 * Decrypts data using AES-256-ECB (used for SEK decryption and response payloads)
 */
export function aesEcbDecrypt(encryptedBase64: string, keyBuffer: Buffer): string {
  const decipher = crypto.createDecipheriv("aes-256-ecb", keyBuffer, null);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(encryptedBase64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Encrypts data using AES-256-ECB with PKCS#7 padding (used for request payloads)
 */
export function aesEcbEncrypt(plainText: string, keyBuffer: Buffer): string {
  const cipher = crypto.createCipheriv("aes-256-ecb", keyBuffer, null);
  cipher.setAutoPadding(true);
  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}
