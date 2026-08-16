"use client";
import { createClient } from "@supabase/supabase-js";

// Browser client using only the public anon key. Used exclusively to perform
// direct-to-storage uploads via short-lived signed upload URLs issued by our
// own API (see /api/upload/sign), so large video files never pass through a
// Vercel serverless function body.
let cached;

export function supabaseBrowser() {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
  return cached;
}
