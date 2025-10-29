import { NextResponse } from "next/server";
import { ensureLeagueMembership, resolveLeagueIdFromToken } from "../../../lib/leagueAccess";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { type SavedSession, type SessionPayload } from "../../../types";

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
    .from("sessions")
    .select(
      `
        id,
        created_at,
        team_a_score,
        team_b_score,
        winner,
        team_names,
        goal_events,
        session_players:session_players (
          player_id,
          team,
          goals,
          assists,
          attendance,
          week_points,
          players:players (
            name
          )
        )
      `
    )
    .eq("league_id", context.leagueId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions: SavedSession[] =
    data?.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      teamAScore: row.team_a_score,
      teamBScore: row.team_b_score,
      winner: row.winner,
      teamNames:
        row.team_names && typeof row.team_names === "object"
          ? {
              A: typeof row.team_names.A === "string" && row.team_names.A.trim().length > 0 ? row.team_names.A : "Team A",
              B: typeof row.team_names.B === "string" && row.team_names.B.trim().length > 0 ? row.team_names.B : "Team B"
            }
          : { A: "Team A", B: "Team B" },
      goalEvents:
        (row.goal_events ?? []).map((event: any) => ({
          id: typeof event.id === "string" ? event.id : `${event.playerId ?? "unknown"}-${row.id}`,
          playerId: String(event.playerId),
          playerName: event.playerName ?? "Unknown",
          team: event.team === "B" ? "B" : "A",
          timestamp: typeof event.timestamp === "string" ? event.timestamp : new Date(row.created_at).toISOString()
        })),
      players:
        row.session_players?.map((player: any) => ({
          playerId: player.player_id,
          playerName: player.players?.name ?? "Unknown",
          team: player.team,
          goals: player.goals,
          assists: player.assists ?? 0,
          attendance: player.attendance,
          weekPoints: player.week_points
        })) ?? []
    })) ?? [];

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const context = await resolveLeagueContext(request);
  if (context instanceof NextResponse) return context;

  const payload = (await request.json()) as SessionPayload;

  if (typeof payload.teamAScore !== "number" || typeof payload.teamBScore !== "number") {
    return NextResponse.json({ error: "Scores are required" }, { status: 400 });
  }

  if (!payload.players || payload.players.length === 0) {
    return NextResponse.json({ error: "At least one player is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const playerIds = payload.players.map((player) => player.playerId);
  const { data: playersCheck, error: playersError } = await supabase
    .from("players")
    .select("id, league_id")
    .in("id", playerIds);

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  const allMatchLeague =
    playersCheck?.every((player) => player.league_id === context.leagueId) ?? true;

  if (!allMatchLeague) {
    return NextResponse.json({ error: "Players must belong to this league" }, { status: 400 });
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      team_a_score: payload.teamAScore,
      team_b_score: payload.teamBScore,
      winner: payload.winner,
      league_id: context.leagueId,
      goal_events: payload.goalEvents ?? []
    })
    .select("id, created_at, team_a_score, team_b_score, winner")
    .single();

  if (sessionError || !sessionRow) {
    return NextResponse.json({ error: sessionError?.message ?? "Unknown error" }, { status: 500 });
  }

  const withSessionId = payload.players.map((player) => ({
    session_id: sessionRow.id,
    player_id: player.playerId,
    team: player.team,
    goals: player.goals,
    assists: player.assists,
    attendance: player.attendance,
    week_points: player.weekPoints
  }));

  const { error: sessionPlayersError } = await supabase
    .from("session_players")
    .insert(withSessionId);

  if (sessionPlayersError) {
    return NextResponse.json({ error: sessionPlayersError.message }, { status: 500 });
  }

  return NextResponse.json({
    session: {
      id: sessionRow.id,
      createdAt: sessionRow.created_at,
      teamAScore: sessionRow.team_a_score,
      teamBScore: sessionRow.team_b_score,
      winner: sessionRow.winner,
      goalEvents: payload.goalEvents ?? []
    }
  });
}
