import { NextResponse } from "next/server";
import { isValidSessionToken, ADMIN_COOKIE_NAME } from "./lib/auth";

export default async function proxy(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authed = await isValidSessionToken(token);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!authed) {
      const loginUrl = new URL("/admin/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login") {
    if (!authed) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
