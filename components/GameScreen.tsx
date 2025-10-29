"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateTeamScore } from "../lib/scoring";
import { type GamePlayer, type GoalEvent, type TeamNames } from "../types";

type GameScreenProps = {
  players: GamePlayer[];
  teamNames: TeamNames;
  goalEvents: GoalEvent[];
  onAdjustGoal: (playerId: string, delta: number) => void;
  onAdjustAssist: (playerId: string, delta: number) => void;
  onAssignTeam: (playerId: string, team: "A" | "B") => void;
  onTeamNamesChange: (team: "A" | "B", name: string) => void;
  onEndGame: (players: GamePlayer[]) => void;
  onBack: () => void;
  enableAssists: boolean;
};

export function GameScreen({
  players,
  teamNames,
  goalEvents,
  onAdjustGoal,
  onAdjustAssist,
  onAssignTeam,
  onTeamNamesChange,
  onEndGame,
  onBack,
  enableAssists
}: GameScreenProps) {
  const [editingTeams, setEditingTeams] = useState(false);
  const [activeNameEdit, setActiveNameEdit] = useState<"A" | "B" | null>(null);
  const [localTeamNames, setLocalTeamNames] = useState<TeamNames>(teamNames);

  useEffect(() => {
    if (activeNameEdit !== "A" && teamNames.A !== localTeamNames.A) {
      setLocalTeamNames((prev) => ({ ...prev, A: teamNames.A }));
    }
    if (activeNameEdit !== "B" && teamNames.B !== localTeamNames.B) {
      setLocalTeamNames((prev) => ({ ...prev, B: teamNames.B }));
    }
  }, [teamNames, activeNameEdit, localTeamNames.A, localTeamNames.B]);

  const handleTeamNameChange = (team: "A" | "B", value: string) => {
    setLocalTeamNames((prev) => ({ ...prev, [team]: value }));
  };

  const commitTeamName = (team: "A" | "B") => {
    onTeamNamesChange(team, localTeamNames[team]);
  };

  const teamAScore = useMemo(() => calculateTeamScore(players, "A"), [players]);
  const teamBScore = useMemo(() => calculateTeamScore(players, "B"), [players]);
  const resolvedTeamNames = useMemo(
    () => ({
      A: localTeamNames.A && localTeamNames.A.trim().length > 0 ? localTeamNames.A : "Team A",
      B: localTeamNames.B && localTeamNames.B.trim().length > 0 ? localTeamNames.B : "Team B"
    }),
    [localTeamNames]
  );

  const playersByTeam = useMemo(() => {
    return players.reduce(
      (acc, player) => {
        acc[player.team].push(player);
        return acc;
      },
      {
        A: [] as GamePlayer[],
        B: [] as GamePlayer[]
      }
    );
  }, [players]);

  const sortedPlayersByTeam = useMemo(() => {
    return {
      A: [...playersByTeam.A].sort((first, second) => first.name.localeCompare(second.name)),
      B: [...playersByTeam.B].sort((first, second) => first.name.localeCompare(second.name))
    };
  }, [playersByTeam]);

  const timeline = useMemo(
    () => [...goalEvents].sort((first, second) => first.timestamp.localeCompare(second.timestamp)),
    [goalEvents]
  );

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
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setEditingTeams((current) => !current)}
          >
            {editingTeams ? "Done editing teams" : "Edit teams"}
          </button>
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
          <label style={{ display: "block", margin: 0, color: "#1d4ed8", fontSize: "0.9rem", fontWeight: 600 }}>
            Team A name
            <input
              value={localTeamNames.A}
              onChange={(event) => handleTeamNameChange("A", event.target.value)}
              onFocus={() => setActiveNameEdit("A")}
              onBlur={() => {
                setActiveNameEdit((current) => (current === "A" ? null : current));
                commitTeamName("A");
              }}
              style={{
                marginTop: "0.35rem",
                width: "100%",
                borderRadius: "999px",
                border: "1px solid rgba(37, 99, 235, 0.4)",
                padding: "0.4rem 0.75rem",
                fontSize: "1rem",
                backgroundColor: "#eff6ff",
                color: "#1d4ed8"
              }}
              aria-label="Team A name"
            />
          </label>
          <p style={{ margin: "0.25rem 0 0", fontSize: "2.5rem", fontWeight: 700 }}>{teamAScore}</p>
        </div>
        <div
          style={{
            borderRadius: "16px",
            padding: "1rem",
            background: "linear-gradient(135deg, rgba(248, 113, 113, 0.18), rgba(239, 68, 68, 0.12))"
          }}
        >
          <label style={{ display: "block", margin: 0, color: "#b91c1c", fontSize: "0.9rem", fontWeight: 600 }}>
            Team B name
            <input
              value={localTeamNames.B}
              onChange={(event) => handleTeamNameChange("B", event.target.value)}
              onFocus={() => setActiveNameEdit("B")}
              onBlur={() => {
                setActiveNameEdit((current) => (current === "B" ? null : current));
                commitTeamName("B");
              }}
              style={{
                marginTop: "0.35rem",
                width: "100%",
                borderRadius: "999px",
                border: "1px solid rgba(248, 113, 113, 0.4)",
                padding: "0.4rem 0.75rem",
                fontSize: "1rem",
                backgroundColor: "#fef2f2",
                color: "#b91c1c"
              }}
              aria-label="Team B name"
            />
          </label>
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
              {resolvedTeamNames[team]}
            </h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {sortedPlayersByTeam[team].map((player) => (
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
                          onClick={() => onAdjustGoal(player.id, -1)}
                          style={{
                            width: "2rem",
                            height: "2rem",
                            padding: 0,
                            borderRadius: "12px",
                            fontSize: "1.15rem"
                          }}
                        >
                          –
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => onAdjustGoal(player.id, 1)}
                          style={{
                            width: "3.25rem",
                            height: "3.25rem",
                            padding: 0,
                            borderRadius: "12px",
                            fontSize: "1.6rem"
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
                            onClick={() => onAdjustAssist(player.id, -1)}
                            style={{
                              width: "2rem",
                              height: "2rem",
                              padding: 0,
                              borderRadius: "12px",
                              fontSize: "1.15rem"
                            }}
                          >
                            A-
                          </button>
                          <button
                          className="button"
                          type="button"
                          onClick={() => onAdjustAssist(player.id, 1)}
                          style={{
                            width: "3.25rem",
                            height: "3.25rem",
                            padding: 0,
                            borderRadius: "12px",
                            fontSize: "1.6rem"
                          }}
                        >
                          A+
                        </button>
                        </div>
                      )}
                      {editingTeams && (
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => onAssignTeam(player.id, player.team === "A" ? "B" : "A")}
                          style={{
                            paddingInline: "0.75rem",
                            whiteSpace: "nowrap"
                          }}
                        >
                          Move to {player.team === "A" ? resolvedTeamNames.B : resolvedTeamNames.A}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </div>
        ))}
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
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  )
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
