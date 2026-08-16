import { NextResponse } from "next/server";
import crypto from "crypto";
import { setSessionCookie } from "../../../../lib/auth";

// POST /api/admin/login { password }
// Replaces login.php. Compares against ADMIN_PASSWORD using a constant-time
// check and sets a signed, httpOnly session cookie.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const password = String(body?.password || "");
  const expected = process.env.ADMIN_PASSWORD || "";

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const valid =
    expected.length > 0 &&
    a.length === b.length &&
    crypto.timingSafeEqual(a, b);

  if (!valid) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  await setSessionCookie(response);
  return response;
}
