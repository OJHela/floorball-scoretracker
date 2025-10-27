import { NextResponse } from "next/server";
import { requireLeagueAdmin } from "../../../../lib/leagueAccess";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(request: Request, { params }: Params) {
  const check = await requireLeagueAdmin(request, params.id);
  if (check) return check;

  const payload = (await request.json()) as {
    attendancePoints?: number;
    goalPoints?: number;
    winBonus?: number;
  };

  const attendancePoints = Number(payload.attendancePoints ?? 1);
  const goalPoints = Number(payload.goalPoints ?? 1);
  const winBonus = Number(payload.winBonus ?? 5);

  if (Number.isNaN(attendancePoints) || Number.isNaN(goalPoints) || Number.isNaN(winBonus)) {
    return NextResponse.json({ error: "Points must be numeric" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("leagues")
    .update({
      attendance_points: attendancePoints,
      goal_points: goalPoints,
      win_bonus: winBonus
    })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    attendancePoints,
    goalPoints,
    winBonus
  });
}

export async function GET(request: Request, { params }: Params) {
  const membershipCheck = await requireLeagueAdmin(request, params.id);
  if (membershipCheck) return membershipCheck;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("leagues")
    .select("attendance_points, goal_points, win_bonus")
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  return NextResponse.json({
    attendancePoints: data.attendance_points ?? 1,
    goalPoints: data.goal_points ?? 1,
    winBonus: data.win_bonus ?? 5
  });
}
