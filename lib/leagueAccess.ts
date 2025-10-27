import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "./supabaseServer";

export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return { userId: null };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { userId: null };
  }

  return { userId: data.user.id };
}

export async function ensureLeagueMembership(request: Request, leagueId: string) {
  const { userId } = await getUserFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function resolveLeagueIdFromToken(publicToken: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("id")
    .eq("public_token", publicToken)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: error.message }, { status: 500 }) };
  }

  if (!data) {
    return { error: NextResponse.json({ error: "League not found" }, { status: 404 }) };
  }

  return { leagueId: data.id };
}
