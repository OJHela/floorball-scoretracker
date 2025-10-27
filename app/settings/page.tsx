"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "../../components/SupabaseProvider";
import { type League } from "../../types";

function SettingsContent() {
  const { session, sessionLoading } = useSupabaseSession();

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ attendancePoints: 1, goalPoints: 1, winBonus: 5 });

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );

  const fetchLeagues = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const response = await fetch("/api/leagues", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store"
    });

    if (!response.ok) {
      setError("Failed to load leagues");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as { leagues: League[] };
    const list = payload.leagues ?? [];
    setLeagues(list);
    if (list.length > 0) {
      setSelectedLeagueId((current) => {
        const nextId = current && list.some((league) => league.id === current) ? current : list[0].id;
        const nextLeague = list.find((league) => league.id === nextId);
        if (nextLeague) {
          setForm({
            attendancePoints: nextLeague.attendancePoints,
            goalPoints: nextLeague.goalPoints,
            winBonus: nextLeague.winBonus
          });
        }
        return nextId;
      });
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchLeagues().catch(() => setLoading(false));
  }, [fetchLeagues]);

  useEffect(() => {
    if (selectedLeague) {
      setForm({
        attendancePoints: selectedLeague.attendancePoints,
        goalPoints: selectedLeague.goalPoints,
        winBonus: selectedLeague.winBonus
      });
    }
  }, [selectedLeague]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedLeagueId) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const response = await fetch(`/api/leagues/${selectedLeagueId}/scoring`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`
      },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? "Could not update scoring");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as {
      attendancePoints: number;
      goalPoints: number;
      winBonus: number;
    };

    setLeagues((current) =>
      current.map((league) =>
        league.id === selectedLeagueId
          ? {
              ...league,
              attendancePoints: payload.attendancePoints,
              goalPoints: payload.goalPoints,
              winBonus: payload.winBonus
            }
          : league
      )
    );

    setSuccessMessage("Scoring updated");
    setLoading(false);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (sessionLoading) {
    return (
      <main className="app-shell">
        <p style={{ color: "#475569" }}>Checking your account…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="app-shell">
        <section className="card">
          <p style={{ margin: 0, color: "#475569" }}>
            Sign in on the home page to manage scoring rules.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header style={{ marginBottom: "1.5rem" }}>
        <Link href="/" className="button button-secondary">
          ← Back to scoreboard
        </Link>
        <h1 style={{ margin: "1rem 0 0", fontSize: "1.8rem", letterSpacing: "-0.01em" }}>
          League Scoring Settings
        </h1>
        <p style={{ margin: "0.5rem 0 0", color: "#475569" }}>
          Adjust attendance, goal, and win bonuses. Changes apply immediately to live games and future summaries.
        </p>
      </header>

      {error && (
        <section className="card" style={{ marginBottom: "1rem" }}>
          <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>
        </section>
      )}

      <section className="card" aria-labelledby="league-select-heading">
        <h2 id="league-select-heading" className="section-title">
          Choose league
        </h2>
        <select
          value={selectedLeagueId ?? ""}
          onChange={(event) => setSelectedLeagueId(event.target.value || null)}
          disabled={loading || leagues.length === 0}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            border: "1px solid rgba(148, 163, 184, 0.7)",
            backgroundColor: "#f8fafc"
          }}
        >
          {leagues.length === 0 ? (
            <option value="">No leagues yet</option>
          ) : (
            leagues.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name} {league.role !== "admin" ? "(read-only)" : ""}
              </option>
            ))
          )}
        </select>
      </section>

      {selectedLeague && (
        <section className="card" style={{ marginTop: "1.5rem" }} aria-labelledby="scoring-heading">
          <h2 id="scoring-heading" className="section-title">
            Point values
          </h2>
          {selectedLeague.role !== "admin" ? (
            <p style={{ color: "#475569" }}>You need admin access to modify scoring for this league.</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", maxWidth: "420px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>Attendance points</span>
                <input
                  type="number"
                  min={0}
                  value={form.attendancePoints}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, attendancePoints: Number(event.target.value) }))
                  }
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid rgba(148, 163, 184, 0.7)",
                    backgroundColor: "#f8fafc"
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>Points per goal</span>
                <input
                  type="number"
                  min={0}
                  value={form.goalPoints}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, goalPoints: Number(event.target.value) }))
                  }
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid rgba(148, 163, 184, 0.7)",
                    backgroundColor: "#f8fafc"
                  }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span>Winning team bonus</span>
                <input
                  type="number"
                  min={0}
                  value={form.winBonus}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, winBonus: Number(event.target.value) }))
                  }
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid rgba(148, 163, 184, 0.7)",
                    backgroundColor: "#f8fafc"
                  }}
                />
              </label>
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save changes"}
              </button>
              {successMessage && <p style={{ color: "#16a34a" }}>{successMessage}</p>}
            </form>
          )}
        </section>
      )}
    </main>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <p style={{ color: "#475569" }}>Loading settings…</p>
        </main>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
