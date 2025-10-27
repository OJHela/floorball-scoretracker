import { NextResponse } from "next/server";
import { requireLeagueAdmin } from "../../../../lib/leagueAccess";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

type Params = {
  params: {
    id: string;
  };
};

export async function DELETE(request: Request, { params }: Params) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");

  if (!leagueId) {
    return NextResponse.json({ error: "leagueId is required" }, { status: 400 });
  }

  const authCheck = await requireLeagueAdmin(request, leagueId);
  if (authCheck) return authCheck;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", params.id)
    .eq("league_id", leagueId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

