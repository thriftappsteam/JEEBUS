import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./config";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Data client for all table/RPC access from server code.
 *
 * Prefers the server-only SUPABASE_SERVICE_ROLE_KEY (required once RLS is
 * enabled — the service role bypasses RLS, and authorization happens in app
 * code via the whoami helpers). Falls back to the anon key so the app keeps
 * working before the env var is configured in Vercel.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component. Safe to ignore if you have
            // middleware refreshing user sessions.
          }
        },
      },
    },
  );
}

/**
 * Auth client — ALWAYS the anon key. Use ONLY for Supabase Auth operations
 * (sending magic links, verifying OTPs). Never use this for table access:
 * once RLS is on, the anon key can't read anything.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — ignore.
        }
      },
    },
  });
}
