import { NextResponse } from "next/server";
import { emptyLiveGameState, type LiveGameState } from "../../../types";
import { ensureLeagueMembership, resolveLeagueIdFromToken } from "../../../lib/leagueAccess";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

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

function sanitizeLiveGameState(state: LiveGameState | null | undefined): LiveGameState {
  if (!state) return { ...emptyLiveGameState };

  const stage = state.stage ?? "roster";
  const selectedPlayerIds = Array.isArray(state.selectedPlayerIds) ? state.selectedPlayerIds : [];
  const assignments =
    state.assignments && typeof state.assignments === "object" ? (state.assignments as Record<string, "A" | "B">) : {};
  const gamePlayers = Array.isArray(state.gamePlayers) ? state.gamePlayers : [];
  const secondsElapsed = typeof state.secondsElapsed === "number" ? state.secondsElapsed : 0;
  const isTimerRunning = Boolean(state.isTimerRunning);
  const timerOwnerId = typeof state.timerOwnerId === "string" ? state.timerOwnerId : null;

  return {
    stage: stage === "setup" || stage === "game" || stage === "summary" ? stage : "roster",
    selectedPlayerIds,
    assignments,
    gamePlayers,
    secondsElapsed,
    isTimerRunning,
    timerOwnerId
  };
}

export async function GET(request: Request) {
  const context = await resolveLeagueContext(request);
  if (context instanceof NextResponse) return context;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("live_games")
    .select("state")
    .eq("league_id", context.leagueId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const state = sanitizeLiveGameState((data?.state ?? null) as LiveGameState | null);

  return NextResponse.json({ state });
}

export async function PUT(request: Request) {
  const context = await resolveLeagueContext(request);
  if (context instanceof NextResponse) return context;

  const payload = (await request.json()) as { state?: LiveGameState };
  const sanitized = sanitizeLiveGameState(payload.state);

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("live_games")
    .upsert({
      league_id: context.leagueId,
      state: sanitized,
      updated_at: new Date().toISOString()
    })
    .eq("league_id", context.leagueId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ state: sanitized });
}
