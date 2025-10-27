"use client";

import { useMemo } from "react";
import { type GamePlayer, type Player, type TeamSide } from "../types";

type SessionSetupProps = {
  roster: Player[];
  selectedPlayerIds: string[];
  assignments: Record<string, TeamSide>;
  onToggleSelection: (playerId: string) => void;
  onToggleTeam: (playerId: string) => void;
  onStartGame: (players: GamePlayer[]) => void;
  onBack: () => void;
};

export function SessionSetup({
  roster,
  selectedPlayerIds,
  assignments,
  onToggleSelection,
  onToggleTeam,
  onStartGame,
  onBack
}: SessionSetupProps) {
  const canStart = selectedPlayerIds.length >= 2;

  const lineup = useMemo<GamePlayer[]>(() => {
    return selectedPlayerIds
      .map((playerId) => {
        const player = roster.find((item) => item.id === playerId);
        if (!player) return null;
        return {
          ...player,
          team: assignments[playerId] ?? "A",
          goals: 0
        } satisfies GamePlayer;
      })
      .filter((value): value is GamePlayer => Boolean(value));
  }, [assignments, roster, selectedPlayerIds]);

  const groupedCounts = useMemo(() => {
    return lineup.reduce(
      (acc, player) => {
        acc[player.team] += 1;
        return acc;
      },
      { A: 0, B: 0 }
    );
  }, [lineup]);

  const handleStart = () => {
    if (!canStart) return;
    onStartGame(lineup);
  };

  return (
    <section className="card" aria-labelledby="setup-heading">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.75rem"
        }}
      >
        <h2 id="setup-heading" className="section-title">
          Weekly Session Setup
        </h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="button button-secondary" type="button" onClick={onBack}>
            Back to roster
          </button>
          <button className="button" type="button" disabled={!canStart} onClick={handleStart}>
            Start Game
          </button>
        </div>
      </header>

      <p style={{ color: "#475569", marginTop: 0 }}>
        Mark who is skating this week, then balance teams by tapping their assignment.
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginTop: "1.25rem",
          flexWrap: "wrap"
        }}
      >
        <div className="pill" style={{ backgroundColor: "rgba(59, 130, 246, 0.12)", color: "#1d4ed8" }}>
          Team A: {groupedCounts.A}
        </div>
        <div className="pill" style={{ backgroundColor: "rgba(248, 113, 113, 0.12)", color: "#b91c1c" }}>
          Team B: {groupedCounts.B}
        </div>
        <div className="pill" style={{ backgroundColor: "rgba(100, 116, 139, 0.12)", color: "#475569" }}>
          Attending: {selectedPlayerIds.length}
        </div>
      </div>

      <ul style={{ listStyle: "none", margin: "1.5rem 0 0", padding: 0, display: "grid", gap: "0.75rem" }}>
        {roster.map((player) => {
          const selected = selectedPlayerIds.includes(player.id);
          const team = assignments[player.id] ?? "A";

          return (
            <li
              key={player.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: selected ? "1px solid rgba(37, 99, 235, 0.6)" : "1px solid rgba(148, 163, 184, 0.4)",
                backgroundColor: selected ? "rgba(37, 99, 235, 0.08)" : "#f8fafc"
              }}
            >
              <button
                type="button"
                onClick={() => onToggleSelection(player.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flex: 1,
                  background: "none",
                  color: "inherit",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "50%",
                    border: "2px solid rgba(37, 99, 235, 0.6)",
                    backgroundColor: selected ? "#2563eb" : "transparent"
                  }}
                />
                <span style={{ fontWeight: 600 }}>{player.name}</span>
              </button>

              {selected && (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => onToggleTeam(player.id)}
                  style={{
                    paddingInline: "1rem",
                    backgroundColor: team === "A" ? "rgba(37, 99, 235, 0.12)" : "rgba(248, 113, 113, 0.12)",
                    color: team === "A" ? "#1d4ed8" : "#b91c1c",
                    borderColor: "transparent"
                  }}
                >
                  Team {team}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
