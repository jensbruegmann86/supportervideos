import { cookies } from "next/headers";

// Uses the Web Crypto API (available in both the Node.js and Edge runtimes)
// so this module can be shared by API routes and middleware/proxy alike.

const COOKIE_NAME = "vu_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is missing or too short");
  }
  return s;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload) {
  const key = await hmacKey();
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(mac);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Creates a signed, tamper-proof session token: "<expiry>.<hmac>"
export async function createSessionToken() {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expires);
  return `${payload}.${await sign(payload)}`;
}

export async function isValidSessionToken(token) {
  if (!token) return false;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return false;
  const expected = await sign(payload);
  if (!timingSafeEqual(expected, mac)) return false;
  return Number(payload) > Date.now();
}

export async function setSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

export async function isAuthenticatedFromRequest(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return isValidSessionToken(token);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
