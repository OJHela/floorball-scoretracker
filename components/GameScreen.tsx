"use client";

import { useMemo } from "react";
import { calculateTeamScore } from "../lib/scoring";
import { type GamePlayer } from "../types";

type GameScreenProps = {
  players: GamePlayer[];
  onPlayersChange: (players: GamePlayer[]) => void;
  onEndGame: (players: GamePlayer[]) => void;
  onBack: () => void;
  enableAssists: boolean;
};

export function GameScreen({ players, onPlayersChange, onEndGame, onBack, enableAssists }: GameScreenProps) {
  const adjustGoals = (playerId: string, delta: number) => {
    const updated = players.map((player) =>
      player.id === playerId ? { ...player, goals: Math.max(0, player.goals + delta) } : player
    );
    onPlayersChange(updated);
  };

  const adjustAssists = (playerId: string, delta: number) => {
    const updated = players.map((player) =>
      player.id === playerId ? { ...player, assists: Math.max(0, player.assists + delta) } : player
    );
    onPlayersChange(updated);
  };

  const teamAScore = useMemo(() => calculateTeamScore(players, "A"), [players]);
  const teamBScore = useMemo(() => calculateTeamScore(players, "B"), [players]);

  const handleEndGame = () => {
    onEndGame(players);
  };

  return (
    <section className="card" aria-labelledby="game-heading">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem"
        }}
      >
        <h2 id="game-heading" className="section-title">
          Live Game
        </h2>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="button button-secondary" type="button" onClick={onBack}>
            Back to setup
          </button>
          <button className="button" type="button" onClick={handleEndGame}>
            End Game
          </button>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          alignItems: "stretch"
        }}
      >
        <div
          style={{
            borderRadius: "16px",
            padding: "1rem",
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(30, 64, 175, 0.12))"
          }}
        >
          <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.2em", color: "#1d4ed8" }}>
            Team A
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "2.5rem", fontWeight: 700 }}>{teamAScore}</p>
        </div>
        <div
          style={{
            borderRadius: "16px",
            padding: "1rem",
            background: "linear-gradient(135deg, rgba(248, 113, 113, 0.18), rgba(239, 68, 68, 0.12))"
          }}
        >
          <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.2em", color: "#b91c1c" }}>
            Team B
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "2.5rem", fontWeight: 700 }}>{teamBScore}</p>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem", display: "grid", gap: "1.25rem" }}>
        {(["A", "B"] as const).map((team) => (
          <div key={team}>
            <h3
              style={{
                margin: "0 0 0.75rem",
                fontSize: "1rem",
                color: team === "A" ? "#1d4ed8" : "#b91c1c"
              }}
            >
              Team {team}
            </h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {players
                .filter((player) => player.team === team)
                .map((player) => (
                  <article
                    key={player.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      borderRadius: "12px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid rgba(148, 163, 184, 0.4)"
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{player.name}</p>
                      <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
                        Goals: {player.goals}
                        {enableAssists && ` • Assists: ${player.assists}`}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className="button button-secondary"
                          type="button"
                          onClick={() => adjustGoals(player.id, -1)}
                          style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            padding: 0,
                            borderRadius: "12px",
                            fontSize: "1.25rem"
                          }}
                        >
                          –
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => adjustGoals(player.id, 1)}
                          style={{
                            width: "2.5rem",
                            height: "2.5rem",
                            padding: 0,
                            borderRadius: "12px",
                            fontSize: "1.25rem"
                          }}
                        >
                          +
                        </button>
                      </div>
                      {enableAssists && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => adjustAssists(player.id, -1)}
                            style={{
                              width: "2.5rem",
                              height: "2.5rem",
                              padding: 0,
                              borderRadius: "12px",
                              fontSize: "1.25rem"
                            }}
                          >
                            A-
                          </button>
                          <button
                            className="button"
                            type="button"
                            onClick={() => adjustAssists(player.id, 1)}
                            style={{
                              width: "2.5rem",
                              height: "2.5rem",
                              padding: 0,
                              borderRadius: "12px",
                              fontSize: "1.25rem"
                            }}
                          >
                            A+
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
