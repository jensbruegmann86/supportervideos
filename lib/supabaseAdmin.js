import { createClient } from "@supabase/supabase-js";

// Server-only client using the service role key. Never import this from a
// client component - it bypasses Row Level Security entirely.
let cached;

export function supabaseAdmin() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export const VIDEO_BUCKET = process.env.SUPABASE_VIDEO_BUCKET || "videos";
