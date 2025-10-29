"use client";

import { useMemo } from "react";
import { buildWeeklyPoints } from "../lib/scoring";
import { type GamePlayer, type GoalEvent, type SavedSession, type ScoringConfig, type TeamNames } from "../types";

type GameSummaryProps = {
  players: GamePlayer[];
  goalEvents: GoalEvent[];
  teamNames: TeamNames;
  onReset: () => void;
  saving: boolean;
  lastError: string | null;
  history: SavedSession[];
  scoringConfig: ScoringConfig;
};

export function GameSummary({
  players,
  goalEvents,
  teamNames,
  onReset,
  saving,
  lastError,
  history,
  scoringConfig
}: GameSummaryProps) {
  const { payload, teamScores, winner } = useMemo(
    () => buildWeeklyPoints(players, scoringConfig),
    [players, scoringConfig]
  );

  const playerNameLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    players.forEach((player) => {
      lookup.set(player.id, player.name);
    });
    return lookup;
  }, [players]);

  const sortedPayload = useMemo(
    () =>
      [...payload].sort((first, second) => {
        const firstName = playerNameLookup.get(first.playerId) ?? "";
        const secondName = playerNameLookup.get(second.playerId) ?? "";
        return firstName.localeCompare(secondName);
      }),
    [payload, playerNameLookup]
  );

  const attendancePoints = scoringConfig.attendancePoints;
  const goalPointsValue = scoringConfig.goalPoints;

  const totalGoals = payload.reduce((sum, player) => sum + player.goals, 0);
  const totalAssists = scoringConfig.enableAssists
    ? payload.reduce((sum, player) => sum + player.assists, 0)
    : 0;

  const resolvedTeamNames = useMemo(
    () => ({
      A: teamNames.A && teamNames.A.trim().length > 0 ? teamNames.A : "Team A",
      B: teamNames.B && teamNames.B.trim().length > 0 ? teamNames.B : "Team B"
    }),
    [teamNames]
  );

  const winnerLabel =
    winner === "Tie"
      ? "Tie game"
      : `${resolvedTeamNames[winner]} wins by ${Math.abs(
          teamScores.A - teamScores.B
        )} goals`;

  const timeline = useMemo(
    () =>
      [...goalEvents].sort((first, second) => first.timestamp.localeCompare(second.timestamp)),
    [goalEvents]
  );

  return (
    <section className="card" aria-labelledby="summary-heading">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem"
        }}
      >
        <h2 id="summary-heading" className="section-title">
          Game Recap
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="button button-secondary" type="button" onClick={onReset}>
            Back to start
          </button>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.25rem"
        }}
      >
        <div className="pill" style={{ backgroundColor: "rgba(37, 99, 235, 0.12)", color: "#1d4ed8" }}>
          {resolvedTeamNames.A}: {teamScores.A}
        </div>
        <div className="pill" style={{ backgroundColor: "rgba(248, 113, 113, 0.12)", color: "#b91c1c" }}>
          {resolvedTeamNames.B}: {teamScores.B}
        </div>
        <div className="pill" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#047857" }}>
          Goals logged: {totalGoals}
        </div>
        {scoringConfig.enableAssists && (
          <div className="pill" style={{ backgroundColor: "rgba(126, 34, 206, 0.12)", color: "#6d28d9" }}>
            Assists logged: {totalAssists}
          </div>
        )}
        <div className="pill" style={{ backgroundColor: "rgba(14, 165, 233, 0.12)", color: "#0ea5e9" }}>
          Result: {winnerLabel}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 0.5rem",
            fontSize: "0.95rem"
          }}
        >
          <thead>
            <tr style={{ color: "#475569", textAlign: "left" }}>
              <th style={{ padding: "0.25rem 0.5rem" }}>Player</th>
              <th style={{ padding: "0.25rem 0.5rem" }}>Team</th>
              <th style={{ padding: "0.25rem 0.5rem" }}>Goals</th>
              {scoringConfig.enableAssists && (
                <th style={{ padding: "0.25rem 0.5rem" }}>Assists</th>
              )}
              <th style={{ padding: "0.25rem 0.5rem" }}>Attendance</th>
              <th style={{ padding: "0.25rem 0.5rem" }}>Winner bonus</th>
              <th style={{ padding: "0.25rem 0.5rem" }}>Weekly points</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayload.map((player) => {
              const assistsPointsValue = scoringConfig.enableAssists ? scoringConfig.assistPoints : 0;
              const basePoints =
                attendancePoints + player.goals * goalPointsValue + player.assists * assistsPointsValue;
              const winnerBonus = player.weekPoints - basePoints;
              return (
                <tr
                  key={player.playerId}
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "12px",
                    boxShadow: "0 1px 0 rgba(148, 163, 184, 0.26)"
                  }}
                >
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 600 }}>
                    {playerNameLookup.get(player.playerId)}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>{resolvedTeamNames[player.team]}</td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>{player.goals}</td>
                  {scoringConfig.enableAssists && (
                    <td style={{ padding: "0.6rem 0.5rem" }}>{player.assists}</td>
                  )}
                  <td style={{ padding: "0.6rem 0.5rem" }}>+{attendancePoints}</td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>{winnerBonus}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 600 }}>{player.weekPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {timeline.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Goal timeline</h3>
          <ol style={{ paddingLeft: "1.25rem", margin: 0, display: "grid", gap: "0.5rem" }}>
            {timeline.map((event, index) => (
              <li key={event.id} style={{ color: "#0f172a" }}>
                <span style={{ fontWeight: 600 }}>
                  #{index + 1} {event.playerName}
                </span>{" "}
                <span style={{ color: "#64748b" }}>
                  ({resolvedTeamNames[event.team]},{" "}
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p style={{ marginTop: "1rem" }}>
        {saving
          ? "Saving session…"
          : lastError
          ? `Save pending: ${lastError}`
          : "Session autosaved."}
      </p>

      <aside style={{ marginTop: "2rem" }}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Recent Weeks</h3>
        {history.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>No saved sessions yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
            {history.slice(0, 3).map((session) => {
              const sessionTeamNames = {
                A:
                  session.teamNames?.A && session.teamNames.A.trim().length > 0
                    ? session.teamNames.A
                    : "Team A",
                B:
                  session.teamNames?.B && session.teamNames.B.trim().length > 0
                    ? session.teamNames.B
                    : "Team B"
              };
              return (
                <li
                  key={session.id}
                  style={{
                    borderRadius: "12px",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid rgba(148, 163, 184, 0.4)"
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {new Date(session.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                  <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>
                    {sessionTeamNames.A} {session.teamAScore} — {sessionTeamNames.B} {session.teamBScore} (
                    {session.winner})
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </section>
  );
}
