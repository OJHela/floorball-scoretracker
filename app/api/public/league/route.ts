import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, public_token, attendance_points, goal_points, win_bonus, enable_assists, assist_points")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  return NextResponse.json({
    league: {
      id: data.id,
      name: data.name,
      publicToken: data.public_token,
      attendancePoints: data.attendance_points ?? 1,
      goalPoints: data.goal_points ?? 1,
      winBonus: data.win_bonus ?? 5,
      enableAssists: data.enable_assists ?? false,
      assistPoints: data.assist_points ?? 1
    }
  });
}
