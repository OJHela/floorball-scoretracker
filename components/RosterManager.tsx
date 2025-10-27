"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { type Player } from "../types";

type LeagueApiConfig = {
  playersUrl: string;
  playerDetailUrl: (playerId: string) => string;
  headers?: Record<string, string>;
};

type RosterManagerProps = {
  onRosterLoaded: (players: Player[]) => void;
  onNext: () => void;
  isAdvancingAllowed: boolean;
  apiConfig: LeagueApiConfig;
};

type EditingState = {
  id: string;
  name: string;
} | null;

export function RosterManager({
  onRosterLoaded,
  onNext,
  isAdvancingAllowed,
  apiConfig
}: RosterManagerProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [editing, setEditing] = useState<EditingState>(null);

  const authHeaders = useMemo(() => ({ ...(apiConfig.headers ?? {}) }), [apiConfig.headers]);
  const jsonHeaders = useMemo(
    () => ({ "Content-Type": "application/json", ...authHeaders }),
    [authHeaders]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const response = await fetch(apiConfig.playersUrl, {
        cache: "no-store",
        headers: { ...authHeaders }
      });
      if (!response.ok) {
        setError("Failed to load players");
        setLoading(false);
        return;
      }

      const payload = (await response.json()) as { players: Player[] };
      setPlayers(payload.players);
      onRosterLoaded(payload.players);
      setLoading(false);
    };

    load().catch(() => {
      setError("Failed to load players");
      setLoading(false);
    });
  }, [apiConfig.playersUrl, authHeaders, onRosterLoaded]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;

    const response = await fetch(apiConfig.playersUrl, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ name: trimmed })
    });

    if (!response.ok) {
      setError("Could not add player");
      return;
    }

    const { player } = (await response.json()) as { player: Player };
    const updated = [...players, player];
    setPlayers(updated);
    onRosterLoaded(updated);
    setNewPlayerName("");
  };

  const startEditing = (player: Player) => {
    setEditing({ id: player.id, name: player.name });
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const saveEditing = async () => {
    if (!editing) return;
    const trimmed = editing.name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }

    const response = await fetch(apiConfig.playerDetailUrl(editing.id), {
      method: "PUT",
      headers: jsonHeaders,
      body: JSON.stringify({ name: trimmed })
    });

    if (!response.ok) {
      setError("Could not update name");
      return;
    }

    const updated = players.map((player) =>
      player.id === editing.id ? { ...player, name: trimmed } : player
    );
    setPlayers(updated);
    onRosterLoaded(updated);
    setEditing(null);
  };

  const deletePlayer = async (player: Player) => {
    const response = await fetch(apiConfig.playerDetailUrl(player.id), {
      method: "DELETE",
      headers: { ...authHeaders }
    });

    if (!response.ok) {
      setError("Could not remove player");
      return;
    }

    const updated = players.filter((item) => item.id !== player.id);
    setPlayers(updated);
    onRosterLoaded(updated);
  };

  return (
    <section className="card" aria-labelledby="roster-heading">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 id="roster-heading" className="section-title">
          Player Roster
        </h2>
        <button
          className="button"
          disabled={!isAdvancingAllowed}
          onClick={() => onNext()}
          type="button"
        >
          Next: Setup
        </button>
      </header>

      <p style={{ marginTop: 0, color: "#475569" }}>Manage up to 40 regular players.</p>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", marginBottom: "1.5rem" }}
      >
        <input
          type="text"
          value={newPlayerName}
          onChange={(event) => setNewPlayerName(event.target.value)}
          placeholder="Player name"
          maxLength={40}
          style={{
            flex: 1,
            padding: "0.6rem 1rem",
            borderRadius: "999px",
            border: "1px solid rgba(148, 163, 184, 0.7)",
            backgroundColor: "#f8fafc"
          }}
        />
        <button className="button" type="submit" disabled={players.length >= 40}>
          Add Player
        </button>
      </form>

      {error && (
        <p style={{ color: "#dc2626", marginTop: 0, marginBottom: "1rem" }} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading roster…</p>
      ) : players.length === 0 ? (
        <p style={{ color: "#64748b" }}>Add your crew to get started.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {players.map((player) => {
            const isEditing = editing?.id === player.id;
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
                  backgroundColor: "#f8fafc",
                  border: "1px solid rgba(148, 163, 184, 0.4)"
                }}
              >
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(event) =>
                        setEditing((current) =>
                          current ? { ...current, name: event.target.value } : current
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "0.5rem 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid rgba(148, 163, 184, 0.8)",
                        backgroundColor: "white"
                      }}
                    />
                    <button
                      className="button"
                      type="button"
                      onClick={saveEditing}
                      style={{ paddingInline: "1rem" }}
                    >
                      Save
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={cancelEditing}
                      style={{ paddingInline: "1rem" }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 600 }}>{player.name}</span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => startEditing(player)}
                        style={{ paddingInline: "1rem" }}
                      >
                        Rename
                      </button>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => deletePlayer(player)}
                        style={{ paddingInline: "1rem", color: "#dc2626", borderColor: "#dc2626" }}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
