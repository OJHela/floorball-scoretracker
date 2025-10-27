import { NextResponse } from "next/server";
import { ensureLeagueMembership, resolveLeagueIdFromToken } from "../../../../lib/leagueAccess";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

type Params = {
  params: {
    id: string;
  };
};

async function resolveLeagueForPlayer(request: Request, playerId: string) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");
  const publicToken = searchParams.get("publicToken");
  const supabase = getSupabaseServerClient();

  const { data: playerRow, error: playerError } = await supabase
    .from("players")
    .select("league_id")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) {
    return { error: NextResponse.json({ error: playerError.message }, { status: 500 }) };
  }

  if (!playerRow) {
    return { error: NextResponse.json({ error: "Player not found" }, { status: 404 }) };
  }

  if (leagueId) {
    if (leagueId !== playerRow.league_id) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    const membershipError = await ensureLeagueMembership(request, leagueId);
    if (membershipError) {
      return { error: membershipError };
    }
    return { leagueId };
  }

  if (publicToken) {
    const result = await resolveLeagueIdFromToken(publicToken);
    if (result.kind === "error") {
      return { error: result.response };
    }

    if (result.leagueId !== playerRow.league_id) {
      return { error: NextResponse.json({ error: "Invalid token" }, { status: 403 }) };
    }
    return { leagueId: result.leagueId };
  }

  return { error: NextResponse.json({ error: "Missing league identifier" }, { status: 400 }) };
}

export async function PUT(request: Request, { params }: Params) {
  const payload = (await request.json()) as { name?: string };
  const name = payload.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const context = await resolveLeagueForPlayer(request, params.id);
  if ("error" in context) return context.error;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("players")
    .update({ name })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const context = await resolveLeagueForPlayer(request, params.id);
  if ("error" in context) return context.error;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("players").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
