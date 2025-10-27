import {
  type GamePlayer,
  type SessionPlayerPayload,
  type TeamSide,
  type ScoringConfig
} from "../types";

export function calculateTeamScore(players: GamePlayer[], side: TeamSide) {
  return players
    .filter((player) => player.team === side)
    .reduce((total, player) => total + player.goals, 0);
}

export function buildWeeklyPoints(players: GamePlayer[], config?: ScoringConfig) {
  const attendancePoints = config?.attendancePoints ?? 1;
  const goalPointsValue = config?.goalPoints ?? 1;
  const winBonusValue = config?.winBonus ?? 5;
  const assistPointsValue = config?.enableAssists ? config.assistPoints ?? 0 : 0;

  const enableAssists = Boolean(config?.enableAssists);

  const teamScores = {
    A: calculateTeamScore(players, "A"),
    B: calculateTeamScore(players, "B")
  };

  let winner: TeamSide | "Tie" = "Tie";
  if (teamScores.A > teamScores.B) winner = "A";
  if (teamScores.B > teamScores.A) winner = "B";

  const payload = players.map<SessionPlayerPayload>((player) => {
    const goalPoints = player.goals * goalPointsValue;
    const assistPoints = enableAssists ? player.assists * assistPointsValue : 0;
    const winnerBonus = winner !== "Tie" && player.team === winner ? winBonusValue : 0;
    const weekPoints = attendancePoints + goalPoints + assistPoints + winnerBonus;

    return {
      playerId: player.id,
      team: player.team,
      goals: player.goals,
      assists: player.assists,
      attendance: true,
      weekPoints
    };
  });

  return {
    payload,
    teamScores,
    winner
  };
}
