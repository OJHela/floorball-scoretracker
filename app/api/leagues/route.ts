import { NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/leagueAccess";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { type League } from "../../../types";

export async function GET(request: Request) {
  const { userId } = await getUserFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("league_members")
    .select(
      `
        role,
        leagues (
          id,
          name,
          public_token,
          attendance_points,
          goal_points,
          win_bonus
        )
      `
    )
    .eq("user_id", userId)
    .order("leagues(name)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leagues: League[] =
    data
      ?.flatMap((entry: any) => {
        if (!entry.leagues) return [];
        const league: League = {
          id: entry.leagues.id,
          name: entry.leagues.name,
          publicToken: entry.leagues.public_token,
          role: entry.role ?? "member",
          attendancePoints: entry.leagues.attendance_points ?? 1,
          goalPoints: entry.leagues.goal_points ?? 1,
          winBonus: entry.leagues.win_bonus ?? 5
        };
        return [league];
      }) ?? [];

  return NextResponse.json({ leagues });
}

export async function POST(request: Request) {
  const { userId } = await getUserFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as { name?: string };
  const name = payload.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "League name is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();

  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .insert({
      name,
      owner_user_id: userId
    })
    .select("id, name, public_token, attendance_points, goal_points, win_bonus")
    .single();

  if (leagueError || !league) {
    return NextResponse.json({ error: leagueError?.message ?? "Could not create league" }, { status: 500 });
  }

  const { error: memberError } = await supabase.from("league_members").insert({
    league_id: league.id,
    user_id: userId,
    role: "admin"
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({
    league: {
      id: league.id,
      name: league.name,
      publicToken: league.public_token,
      role: "admin",
      attendancePoints: league.attendance_points ?? 1,
      goalPoints: league.goal_points ?? 1,
      winBonus: league.win_bonus ?? 5
    } satisfies League
  });
}
