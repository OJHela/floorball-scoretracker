import { NextResponse } from "next/server";
import { ensureLeagueMembership, resolveLeagueIdFromToken } from "../../../lib/leagueAccess";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { type Player } from "../../../types";

type LeagueContext =
  | { leagueId: string; access: "authenticated" }
  | { leagueId: string; access: "public" };

async function resolveLeagueContext(request: Request): Promise<LeagueContext | NextResponse> {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");
  const publicToken = searchParams.get("publicToken");

  if (leagueId) {
    const membershipError = await ensureLeagueMembership(request, leagueId);
    if (membershipError) return membershipError;
    return { leagueId, access: "authenticated" };
  }

  if (publicToken) {
    const result = await resolveLeagueIdFromToken(publicToken);
    if (result.kind === "error") {
      return result.response;
    }

    return { leagueId: result.leagueId, access: "public" };
  }

  return NextResponse.json({ error: "Missing league identifier" }, { status: 400 });
}

export async function GET(request: Request) {
  const context = await resolveLeagueContext(request);
  if (context instanceof NextResponse) return context;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, name")
    .eq("league_id", context.leagueId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ players: data as Player[] });
}

export async function POST(request: Request) {
  const context = await resolveLeagueContext(request);
  if (context instanceof NextResponse) return context;

  const payload = (await request.json()) as { name?: string };

  const name = payload.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ name, league_id: context.leagueId })
    .select("id, name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ player: data as Player }, { status: 201 });
}
