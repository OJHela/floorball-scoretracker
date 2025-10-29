"use client";

import { useMemo, useState } from "react";
import { type SavedSession } from "../types";

type HistoryLeaderboardProps = {
  history: SavedSession[];
  onRefresh: () => void;
  loading: boolean;
  canDelete?: boolean;
  onDeleteSession?: (sessionId: string) => void;
  deletingId?: string | null;
};

type LeaderboardSortKey = "name" | "points" | "goals" | "assists" | "attendance";

export function HistoryLeaderboard({
  history,
  onRefresh,
  loading,
  canDelete = false,
  onDeleteSession,
  deletingId
}: HistoryLeaderboardProps) {
  const [sortKey, setSortKey] = useState<LeaderboardSortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const leaderboardBase = useMemo(() => {
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

    return Array.from(totals.values());
  }, [history]);

  const leaderboard = useMemo(() => {
    const sorted = [...leaderboardBase].sort((first, second) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortKey === "name") {
        return first.name.localeCompare(second.name) * direction;
      }

      return (first[sortKey] - second[sortKey]) * direction;
    });
    return sorted;
  }, [leaderboardBase, sortDirection, sortKey]);

  const handleSort = (key: LeaderboardSortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "name" ? "asc" : "desc");
  };

  const renderSortIndicator = (key: LeaderboardSortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? "asc" : "desc";
  };

  const buildSortAriaLabel = (key: LeaderboardSortKey, label: string) => {
    if (sortKey === key) {
      const directionText = sortDirection === "asc" ? "ascending" : "descending";
      return `Sort by ${label} (${directionText})`;
    }
    return `Sort by ${label}`;
  };

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
                    <th style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        aria-label={buildSortAriaLabel("name", "player name")}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          color: "inherit",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}
                      >
                        Player
                        <span aria-hidden>{renderSortIndicator("name")}</span>
                      </button>
                    </th>
                    <th style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleSort("points")}
                        aria-label={buildSortAriaLabel("points", "points")}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          color: "inherit",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}
                      >
                        Points
                        <span aria-hidden>{renderSortIndicator("points")}</span>
                      </button>
                    </th>
                    <th style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleSort("goals")}
                        aria-label={buildSortAriaLabel("goals", "goals")}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          color: "inherit",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}
                      >
                        Goals
                        <span aria-hidden>{renderSortIndicator("goals")}</span>
                      </button>
                    </th>
                    <th style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleSort("assists")}
                        aria-label={buildSortAriaLabel("assists", "assists")}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          color: "inherit",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}
                      >
                        Assists
                        <span aria-hidden>{renderSortIndicator("assists")}</span>
                      </button>
                    </th>
                    <th style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => handleSort("attendance")}
                        aria-label={buildSortAriaLabel("attendance", "weeks played")}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          color: "inherit",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem"
                        }}
                      >
                        Weeks
                        <span aria-hidden>{renderSortIndicator("attendance")}</span>
                      </button>
                    </th>
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
              {history.map((session) => {
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
                const resultLabel =
                  session.winner === "Tie"
                    ? "Tie game"
                    : `${sessionTeamNames[session.winner]} win`;
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
                      {sessionTeamNames.A} {session.teamAScore} — {sessionTeamNames.B} {session.teamBScore}
                    </span>
                  </div>
                  <p style={{ margin: "0.25rem 0 0", color: "#475569" }}>Result: {resultLabel}</p>
                  {canDelete && onDeleteSession && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => onDeleteSession(session.id)}
                        disabled={deletingId === session.id}
                        style={{ color: "#dc2626", borderColor: "#dc2626" }}
                      >
                        {deletingId === session.id ? "Deleting…" : "Delete session"}
                      </button>
                    </div>
                  )}

                  <details style={{ marginTop: "0.5rem" }}>
                    <summary style={{ cursor: "pointer", color: "#2563eb", fontWeight: 600 }}>
                      Player breakdown
                    </summary>
                    <ul style={{ listStyle: "none", padding: "0.5rem 0 0", margin: 0 }}>
                      {[...session.players]
                        .sort((first, second) => first.playerName.localeCompare(second.playerName))
                        .map((player) => (
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
                          <span>{sessionTeamNames[player.team]}</span>
                          <span>{player.goals} goals</span>
                          <span>{player.assists ?? 0} assists</span>
                          <span>{player.weekPoints} pts</span>
                        </li>
                      ))}
                    </ul>
                    {session.goalEvents.length > 0 && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <p style={{ margin: "0 0 0.35rem", fontWeight: 600, color: "#0f172a" }}>Goal timeline</p>
                        <ol style={{ paddingLeft: "1.25rem", margin: 0, display: "grid", gap: "0.35rem" }}>
                          {[...session.goalEvents]
                            .sort((first, second) => first.timestamp.localeCompare(second.timestamp))
                            .map((event, index) => (
                              <li key={event.id} style={{ color: "#475569" }}>
                                <span style={{ fontWeight: 600, color: "#0f172a" }}>
                                  #{index + 1} {event.playerName}
                                </span>{" "}
                                ({sessionTeamNames[event.team]},{" "}
                                {new Date(event.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                                )
                              </li>
                            ))}
                        </ol>
                      </div>
                    )}
                  </details>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
