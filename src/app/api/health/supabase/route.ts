import { NextResponse } from "next/server";
import { getSupabasePublicConfig, getSupabaseServiceRoleKey } from "@/lib/supabase/config";

export async function GET() {
  const config = getSupabasePublicConfig();
  if (!config) {
    return NextResponse.json(
      {
        status: "not_configured",
        database: "unavailable",
        message: "Configure NEXT_PUBLIC_SUPABASE_URL and a public Supabase key.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/health`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const reachable = response.status < 500;

    return NextResponse.json(
      {
        status: reachable ? "connected" : "error",
        database: reachable ? "reachable" : "unreachable",
        httpStatus: response.status,
        serviceRoleConfigured: Boolean(getSupabaseServiceRoleKey()),
      },
      { status: reachable ? 200 : 502 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Unable to reach Supabase.",
      },
      { status: 502 },
    );
  }
}
