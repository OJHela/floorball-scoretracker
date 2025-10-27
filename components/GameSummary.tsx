"use client";

import { useMemo, useState } from "react";
import { buildWeeklyPoints } from "../lib/scoring";
import { type GamePlayer, type SavedSession, type ScoringConfig } from "../types";

type GameSummaryProps = {
  players: GamePlayer[];
  onSave: (notes?: string) => Promise<void>;
  onReset: () => void;
  saving: boolean;
  lastError: string | null;
  history: SavedSession[];
  scoringConfig: ScoringConfig;
};

export function GameSummary({
  players,
  onSave,
  onReset,
  saving,
  lastError,
  history,
  scoringConfig
}: GameSummaryProps) {
  const [savingSuccess, setSavingSuccess] = useState(false);

  const { payload, teamScores, winner } = useMemo(
    () => buildWeeklyPoints(players, scoringConfig),
    [players, scoringConfig]
  );

  const attendancePoints = scoringConfig.attendancePoints;
  const goalPointsValue = scoringConfig.goalPoints;

  const totalGoals = payload.reduce((sum, player) => sum + player.goals, 0);

  const winnerLabel =
    winner === "Tie"
      ? "Tie game"
      : `Team ${winner} wins by ${Math.abs(teamScores.A - teamScores.B)} goals`;

  const handleSave = async () => {
    setSavingSuccess(false);
    await onSave();
    setSavingSuccess(true);
    setTimeout(() => setSavingSuccess(false), 4000);
  };

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
          <button className="button" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Session"}
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
          Team A: {teamScores.A}
        </div>
        <div className="pill" style={{ backgroundColor: "rgba(248, 113, 113, 0.12)", color: "#b91c1c" }}>
          Team B: {teamScores.B}
        </div>
        <div className="pill" style={{ backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#047857" }}>
          Goals logged: {totalGoals}
        </div>
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
              <th style={{ padding: "0.25rem 0.5rem" }}>Attendance</th>
              <th style={{ padding: "0.25rem 0.5rem" }}>Winner bonus</th>
              <th style={{ padding: "0.25rem 0.5rem" }}>Weekly points</th>
            </tr>
          </thead>
          <tbody>
            {payload.map((player) => {
              const basePoints = attendancePoints + player.goals * goalPointsValue;
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
                    {players.find((item) => item.id === player.playerId)?.name}
                  </td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>Team {player.team}</td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>{player.goals}</td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>+{attendancePoints}</td>
                  <td style={{ padding: "0.6rem 0.5rem" }}>{winnerBonus}</td>
                  <td style={{ padding: "0.6rem 0.5rem", fontWeight: 600 }}>{player.weekPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {lastError && (
        <p style={{ color: "#dc2626", marginTop: "1rem" }} role="alert">
          {lastError}
        </p>
      )}
      {savingSuccess && !lastError && (
        <p style={{ color: "#16a34a", marginTop: "1rem" }}>Session saved. Nice work!</p>
      )}

      <aside style={{ marginTop: "2rem" }}>
        <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Recent Weeks</h3>
        {history.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>No saved sessions yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
            {history.slice(0, 3).map((session) => (
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
                  Team A {session.teamAScore} — Team B {session.teamBScore} ({session.winner})
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </section>
  );
}
