import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/auth";

// POST /api/admin/logout - replaces logout.php
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
