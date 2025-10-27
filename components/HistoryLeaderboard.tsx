"use client";

import { useMemo } from "react";
import { type SavedSession } from "../types";

type HistoryLeaderboardProps = {
  history: SavedSession[];
  onRefresh: () => void;
  loading: boolean;
};

export function HistoryLeaderboard({ history, onRefresh, loading }: HistoryLeaderboardProps) {
  const leaderboard = useMemo(() => {
    const totals = new Map<
      string,
      {
        name: string;
        points: number;
        goals: number;
        assists: number;
        attendance: number;
      }
    >();

    history.forEach((session) => {
      session.players.forEach((player) => {
        const entry = totals.get(player.playerId);
        if (entry) {
          entry.points += player.weekPoints;
          entry.goals += player.goals;
          entry.assists += player.assists ?? 0;
          entry.attendance += player.attendance ? 1 : 0;
        } else {
          totals.set(player.playerId, {
            name: player.playerName,
            points: player.weekPoints,
            goals: player.goals,
            assists: player.assists ?? 0,
            attendance: player.attendance ? 1 : 0
          });
        }
      });
    });

    return Array.from(totals.values()).sort((a, b) => b.points - a.points);
  }, [history]);

  return (
    <section className="card" aria-labelledby="history-heading">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem"
        }}
      >
        <h2 id="history-heading" className="section-title">
          Season History & Leaderboard
        </h2>
        <button className="button button-secondary" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {history.length === 0 ? (
        <p style={{ color: "#64748b", margin: 0 }}>Save a game to start the leaderboard.</p>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>Leaderboard</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
                <thead>
                  <tr style={{ color: "#475569", textAlign: "left" }}>
                    <th style={{ padding: "0.5rem" }}>Player</th>
                    <th style={{ padding: "0.5rem" }}>Points</th>
                    <th style={{ padding: "0.5rem" }}>Goals</th>
                    <th style={{ padding: "0.5rem" }}>Assists</th>
                    <th style={{ padding: "0.5rem" }}>Weeks</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((player) => (
                    <tr
                      key={player.name}
                      style={{ borderBottom: "1px solid rgba(148, 163, 184, 0.3)", color: "#0f172a" }}
                    >
                      <td style={{ padding: "0.6rem 0.5rem", fontWeight: 600 }}>{player.name}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>{player.points}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>{player.goals}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>{player.assists}</td>
                      <td style={{ padding: "0.6rem 0.5rem" }}>{player.attendance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600 }}>All Weeks</h3>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
              {history.map((session) => (
                <li
                  key={session.id}
                  style={{
                    borderRadius: "12px",
                    padding: "0.75rem 1rem",
                    backgroundColor: "#f8fafc",
                    border: "1px solid rgba(148, 163, 184, 0.4)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {new Date(session.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                    <span
                      className="pill"
                      style={{
                        backgroundColor: "rgba(37, 99, 235, 0.12)",
                        color: "#1d4ed8"
                      }}
                    >
                      Team A {session.teamAScore} — Team B {session.teamBScore}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>Result: {session.winner}</p>

                  <details style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer", color: "#2563eb", fontWeight: 600 }}>
                      Player breakdown
                    </summary>
                    <ul style={{ listStyle: "none", padding: "0.5rem 0 0", margin: 0 }}>
                      {session.players.map((player) => (
                        <li
                          key={player.playerId}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.5fr repeat(4, 1fr)",
                            padding: "0.35rem 0",
                            borderBottom: "1px solid rgba(148, 163, 184, 0.2)"
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{player.playerName}</span>
                          <span>Team {player.team}</span>
                          <span>{player.goals} goals</span>
                          <span>{player.assists ?? 0} assists</span>
                          <span>{player.weekPoints} pts</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
