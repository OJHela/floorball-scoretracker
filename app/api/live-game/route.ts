import { NextResponse } from "next/server";
import {
  emptyLiveGameState,
  type GoalEvent,
  type LiveGameState,
  type TeamNames,
  type TeamSide
} from "../../../types";
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
  const gamePlayers = Array.isArray(state.gamePlayers)
    ? state.gamePlayers.map((player: any) => ({
        id: String(player.id),
        name: typeof player.name === "string" ? player.name : "",
        team: (player.team === "B" ? "B" : "A") as TeamSide,
        goals: typeof player.goals === "number" ? Math.max(0, player.goals) : 0,
        assists: typeof player.assists === "number" ? Math.max(0, player.assists) : 0
      }))
    : [];
  const teamNames: TeamNames =
    state.teamNames && typeof state.teamNames === "object"
      ? {
          A: typeof state.teamNames.A === "string" ? state.teamNames.A : "Team A",
          B: typeof state.teamNames.B === "string" ? state.teamNames.B : "Team B"
        }
      : { A: "Team A", B: "Team B" };
  const goalEvents = Array.isArray(state.goalEvents)
    ? state.goalEvents
        .map((event: any): GoalEvent | null => {
          const playerId = typeof event.playerId === "string" ? event.playerId : String(event.playerId ?? "");
          const playerName = typeof event.playerName === "string" ? event.playerName : "";
          const team = event.team === "B" ? "B" : "A";
          const timestamp =
            typeof event.timestamp === "string" && event.timestamp.length > 0
              ? event.timestamp
              : new Date().toISOString();
          const id =
            typeof event.id === "string" && event.id.length > 0
              ? event.id
              : typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${playerId}-${timestamp}`;
          if (!playerId) return null;
          return {
            id,
            playerId,
            playerName,
            team,
            timestamp
          };
        })
        .filter((event: GoalEvent | null): event is GoalEvent => Boolean(event))
    : [];
  const secondsElapsed = typeof state.secondsElapsed === "number" ? state.secondsElapsed : 0;
  const isTimerRunning = Boolean(state.isTimerRunning);
  const timerOwnerId = typeof state.timerOwnerId === "string" ? state.timerOwnerId : null;
  const lastUpdated =
    typeof state.lastUpdated === "number" && Number.isFinite(state.lastUpdated) ? state.lastUpdated : Date.now();

  return {
    stage: stage === "setup" || stage === "game" || stage === "summary" ? stage : "roster",
    selectedPlayerIds,
    assignments,
    gamePlayers,
    teamNames,
    goalEvents,
    secondsElapsed,
    isTimerRunning,
    timerOwnerId,
    alarmAtSeconds: typeof state.alarmAtSeconds === "number" ? Math.max(0, state.alarmAtSeconds) : null,
    alarmAcknowledged: Boolean(state.alarmAcknowledged),
    lastUpdated
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
