import { createPrivateKey, createSign } from "node:crypto";
import { getConfig, getSecret } from "@/lib/config";
import { logger } from "@/lib/logger";

/**
 * VAPID (RFC 8292) untuk Web Push — implementasi tanpa dependency `web-push`,
 * pakai Node crypto bawaan.
 *
 * Kunci VAPID = EC P-256 keypair:
 *   - public  : base64url dari titik tak-terkompresi 65-byte (0x04 || X || Y)
 *   - private : base64url dari skalar 32-byte (d)
 *
 * Config/secret:
 *   - notifications.push.vapid_public_key   (app_config, boleh publik)
 *   - notifications.push.vapid_private_key  (app_secret, RAHASIA)
 *   - notifications.push.subject            (app_config, mailto:... default)
 *
 * Generate sekali: lihat scripts atau `npx web-push generate-vapid-keys`.
 */

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}
function bufToB64url(b: Buffer): string {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

let cached: VapidKeys | null = null;

export async function getVapidKeys(): Promise<VapidKeys | null> {
  if (cached) return cached;
  try {
    const publicKey = await getConfig<string>("notifications.push.vapid_public_key", {
      defaultValue: "",
    });
    if (!publicKey) return null;
    const privateKey = await getSecret("notifications.push.vapid_private_key").catch(() => "");
    if (!privateKey) return null;
    const subject = await getConfig<string>("notifications.push.subject", {
      defaultValue: "mailto:support@nubuat.id",
    });
    cached = { publicKey, privateKey, subject };
    return cached;
  } catch (err) {
    logger.warn({ err }, "VAPID keys belum dikonfigurasi");
    return null;
  }
}

/** Public key untuk dikirim ke client (applicationServerKey). */
export async function getVapidPublicKey(): Promise<string | null> {
  const k = await getVapidKeys();
  return k?.publicKey ?? null;
}

/** Bangun EC private key object dari pasangan base64url (public point + private scalar). */
function buildPrivateKeyObject(keys: VapidKeys) {
  const pub = b64urlToBuf(keys.publicKey); // 65 byte: 0x04 || X(32) || Y(32)
  const d = b64urlToBuf(keys.privateKey); // 32 byte
  const x = pub.subarray(1, 33);
  const y = pub.subarray(33, 65);
  return createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: bufToB64url(x),
      y: bufToB64url(y),
      d: bufToB64url(d),
    },
    format: "jwk",
  });
}

/**
 * Bangun header Authorization VAPID (skema "vapid") untuk satu push endpoint.
 * JWT ES256: header {typ:JWT,alg:ES256}, payload {aud,exp,sub}.
 */
export async function buildVapidHeaders(endpoint: string): Promise<Record<string, string> | null> {
  const keys = await getVapidKeys();
  if (!keys) return null;

  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 jam
  const header = bufToB64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bufToB64url(Buffer.from(JSON.stringify({ aud, exp, sub: keys.subject })));
  const signingInput = `${header}.${payload}`;

  const sign = createSign("SHA256");
  sign.update(signingInput);
  sign.end();
  // dsaEncoding ieee-p1363 → signature raw r||s (64 byte), sesuai JWT ES256.
  const sig = sign.sign({ key: buildPrivateKeyObject(keys), dsaEncoding: "ieee-p1363" });
  const jwt = `${signingInput}.${bufToB64url(sig)}`;

  return {
    Authorization: `vapid t=${jwt}, k=${keys.publicKey}`,
  };
}
