// TEMPORARY diagnostic — confirms whether the service-role key reaches the
// runtime. Reveals only presence, length, and key TYPE prefix (never secret
// material). Token-guarded. DELETE after the env issue is resolved.

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("t") !== "hyetas-envcheck-20260610") {
    return new Response("not found", { status: 404 });
  }

  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Response.json({
    present: typeof k === "string",
    length: typeof k === "string" ? k.length : 0,
    typePrefix: typeof k === "string" ? k.slice(0, 9) : null,
    supabaseEnvNames: Object.keys(process.env).filter((n) =>
      n.toUpperCase().includes("SUPABASE"),
    ),
    vercelEnv: process.env.VERCEL_ENV ?? null,
  });
}
