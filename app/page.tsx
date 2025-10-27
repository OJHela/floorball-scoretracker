"use client";

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GameScreen } from "../components/GameScreen";
import { GameSummary } from "../components/GameSummary";
import { HistoryLeaderboard } from "../components/HistoryLeaderboard";
import { RosterManager } from "../components/RosterManager";
import { SessionSetup } from "../components/SessionSetup";
import { useSupabaseClient, useSupabaseSession } from "../components/SupabaseProvider";
import { buildWeeklyPoints } from "../lib/scoring";
import {
  type GamePlayer,
  type League,
  type LeagueAccess,
  type LeagueSummary,
  type Player,
  type SavedSession
} from "../types";

type Stage = "roster" | "setup" | "game" | "summary";

type LeagueApiConfig = {
  playersUrl: string;
  playerDetailUrl: (playerId: string) => string;
  sessionsUrl: string;
  headers?: Record<string, string>;
};

function PageContent() {
  const searchParams = useSearchParams();
  const shareToken = searchParams.get("token");

  const supabase = useSupabaseClient();
  const { session, sessionLoading } = useSupabaseSession();

  const [stage, setStage] = useState<Stage>("roster");
  const [roster, setRoster] = useState<Player[]>([]);
  const [gamePlayers, setGamePlayers] = useState<GamePlayer[]>([]);
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saveState, setSaveState] = useState<{ saving: boolean; error: string | null }>({
    saving: false,
    error: null
  });

  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [leagueError, setLeagueError] = useState<string | null>(null);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [createLeaguePending, setCreateLeaguePending] = useState(false);

  const [publicLeague, setPublicLeague] = useState<LeagueSummary | null>(null);
  const [publicLeagueLoading, setPublicLeagueLoading] = useState(false);
  const [publicLeagueError, setPublicLeagueError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCopyMessage, setShareCopyMessage] = useState<string | null>(null);

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );

  const leagueAccess: LeagueAccess | null = useMemo(() => {
    if (publicLeague) {
      return { type: "public", league: publicLeague };
    }
    if (selectedLeague && session) {
      return {
        type: "authenticated",
        league: selectedLeague,
        accessToken: session.access_token
      };
    }
    return null;
  }, [publicLeague, selectedLeague, session]);

  const apiConfig: LeagueApiConfig | null = useMemo(() => {
    if (!leagueAccess) return null;

    const query =
      leagueAccess.type === "authenticated"
        ? `leagueId=${leagueAccess.league.id}`
        : `publicToken=${leagueAccess.league.publicToken}`;

    const headers =
      leagueAccess.type === "authenticated"
        ? { Authorization: `Bearer ${leagueAccess.accessToken}` }
        : undefined;

    return {
      playersUrl: `/api/players?${query}`,
      playerDetailUrl: (playerId: string) => `/api/players/${playerId}?${query}`,
      sessionsUrl: `/api/sessions?${query}`,
      headers
    };
  }, [leagueAccess]);

  useEffect(() => {
    if (!leagueAccess) {
      setShareUrl("");
      return;
    }

    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    setShareUrl(`${origin}?token=${leagueAccess.league.publicToken}`);
  }, [leagueAccess]);

  const loadHistory = useCallback(async () => {
    if (!apiConfig) return;
    setHistoryLoading(true);

    const response = await fetch(apiConfig.sessionsUrl, {
      cache: "no-store",
      headers: apiConfig.headers
    });

    if (!response.ok) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    const payload = (await response.json()) as { sessions: SavedSession[] };
    setHistory(payload.sessions);
    setHistoryLoading(false);
  }, [apiConfig]);

  const fetchLeagues = useCallback(async () => {
    if (!session) return;
    setLeaguesLoading(true);
    setLeagueError(null);

    const response = await fetch("/api/leagues", {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store"
    });

    if (!response.ok) {
      setLeagues([]);
      setLeagueError("Failed to load your leagues.");
      setLeaguesLoading(false);
      return;
    }

    const payload = (await response.json()) as { leagues: League[] };
    setLeagues(payload.leagues ?? []);
    setLeaguesLoading(false);
  }, [session]);

  useEffect(() => {
    if (!shareToken) {
      setPublicLeague(null);
      setPublicLeagueError(null);
      setPublicLeagueLoading(false);
      return;
    }

    setPublicLeagueLoading(true);
    setPublicLeagueError(null);
    fetch(`/api/public/league?token=${shareToken}`)
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json();
          setPublicLeague(null);
          setPublicLeagueError(payload.error ?? "League not found.");
          return;
        }
        const payload = (await response.json()) as { league: LeagueSummary };
        setPublicLeagueError(null);
        setPublicLeague(payload.league);
        setStage("roster");
        setGamePlayers([]);
        setRoster([]);
      })
      .catch(() => {
        setPublicLeague(null);
        setPublicLeagueError("Unable to load shared league.");
      })
      .finally(() => setPublicLeagueLoading(false));
  }, [shareToken]);

  useEffect(() => {
    if (!session) {
      setLeagues([]);
      setSelectedLeagueId(null);
      return;
    }
    if (shareToken) return;
    fetchLeagues().catch(() => setLeaguesLoading(false));
  }, [session, shareToken, fetchLeagues]);

  useEffect(() => {
    if (!session || shareToken) return;
    if (leagues.length === 0) {
      setSelectedLeagueId(null);
      return;
    }

    setSelectedLeagueId((current) => {
      if (current) {
        const stillExists = leagues.some((league) => league.id === current);
        if (stillExists) return current;
      }
      return leagues[0].id;
    });
  }, [leagues, session, shareToken]);

  useEffect(() => {
    if (!apiConfig) return;
    setStage("roster");
    setRoster([]);
    setGamePlayers([]);
    loadHistory().catch(() => setHistoryLoading(false));
  }, [apiConfig, loadHistory]);

  const canAdvance = useMemo(() => roster.length >= 2, [roster.length]);

  const handleRosterLoaded = useCallback((players: Player[]) => {
    setRoster(players);
  }, []);

  const handleStartGame = (players: GamePlayer[]) => {
    setGamePlayers(players);
    setStage("game");
  };

  const handlePlayersChange = (players: GamePlayer[]) => {
    setGamePlayers(players);
  };

  const handleEndGame = (players: GamePlayer[]) => {
    setGamePlayers(players);
    setStage("summary");
  };

  const handleSaveSession = async () => {
    if (!apiConfig) return;
    setSaveState({ saving: true, error: null });
    const { payload, teamScores, winner } = buildWeeklyPoints(gamePlayers);

    const response = await fetch(apiConfig.sessionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiConfig.headers ?? {})
      },
      body: JSON.stringify({
        teamAScore: teamScores.A,
        teamBScore: teamScores.B,
        winner,
        players: payload
      })
    });

    if (!response.ok) {
      setSaveState({ saving: false, error: "Failed to save session" });
      return;
    }

    await loadHistory();
    setSaveState({ saving: false, error: null });
  };

  const resetToRoster = () => {
    setStage("roster");
    setGamePlayers([]);
  };

  const handleCreateLeague = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;
    const trimmed = newLeagueName.trim();
    if (!trimmed) return;

    setCreateLeaguePending(true);
    setLeagueError(null);

    const response = await fetch("/api/leagues", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ name: trimmed })
    });

    if (!response.ok) {
      setLeagueError("Could not create league. Try again.");
      setCreateLeaguePending(false);
      return;
    }

    const payload = (await response.json()) as { league: League };
    setLeagues((previous) => [...previous, payload.league]);
    setSelectedLeagueId(payload.league.id);
    setNewLeagueName("");
    setCreateLeaguePending(false);
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setAuthError("Email is required.");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setAuthPending(true);
    setAuthFeedback(null);
    setAuthError(null);

    if (authMode === "sign-up") {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password
      });

      if (error) {
        setAuthError(error.message);
        setAuthPending(false);
        return;
      }

      if (data.session) {
        setAuthFeedback("Account created! You're signed in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        });
        if (signInError) {
          setAuthFeedback("Account created. Sign in with your password.");
        } else {
          setAuthFeedback("Account created! You're signed in.");
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (error) {
        setAuthError(error.message);
        setAuthPending(false);
        return;
      }

      setAuthFeedback("Signed in successfully.");
    }

    setAuthPending(false);
    setEmail("");
    setPassword("");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLeagues([]);
    setSelectedLeagueId(null);
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    if (!navigator?.clipboard) {
      setShareCopyMessage("Copy not supported in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopyMessage("Link copied!");
      setTimeout(() => setShareCopyMessage(null), 2500);
    } catch {
      setShareCopyMessage("Unable to copy link.");
    }
  };

  return (
    <main className="app-shell">
      <header style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p
              style={{
                display: "inline-block",
                padding: "0.35rem 0.75rem",
                borderRadius: "999px",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                color: "#1d4ed8",
                fontSize: "0.8rem",
                fontWeight: 600,
                margin: 0
              }}
            >
              MVP 1.1
            </p>
            <h1 style={{ margin: "0.75rem 0 0", fontSize: "2rem", letterSpacing: "-0.02em" }}>
              Floorball Scoretracker
            </h1>
            <p style={{ margin: "0.5rem 0 0", color: "#475569", maxWidth: "520px" }}>
              Manage multiple leagues, track live scores, and share a public link so anyone can keep the
              scoreboard running.
            </p>
          </div>

          {leagueAccess && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "flex-end",
                gap: "0.5rem",
                minWidth: "240px"
              }}
            >
              <span
                className="pill"
                style={{
                  alignSelf: "flex-end",
                  backgroundColor: "rgba(30, 64, 175, 0.12)",
                  color: "#1e40af"
                }}
              >
                {leagueAccess.league.name}
              </span>
              <button
                className="button button-secondary"
                type="button"
                onClick={copyShareLink}
                style={{ width: "100%" }}
              >
                Copy Share Link
              </button>
              {shareCopyMessage && <span style={{ color: "#16a34a", fontSize: "0.85rem" }}>{shareCopyMessage}</span>}
            </div>
          )}
        </div>
      </header>

      {shareToken && publicLeagueLoading && (
        <section className="card">
          <p style={{ margin: 0, color: "#475569" }}>Loading shared league…</p>
        </section>
      )}

      {shareToken && publicLeagueError && (
        <section className="card">
          <p style={{ margin: 0, color: "#dc2626" }}>{publicLeagueError}</p>
        </section>
      )}

      {sessionLoading && !leagueAccess && !shareToken && (
        <section className="card">
          <p style={{ margin: 0, color: "#475569" }}>Checking your account…</p>
        </section>
      )}

      {!session && !shareToken && !leagueAccess && (
        <section className="card" aria-labelledby="auth-heading">
          <h2 id="auth-heading" className="section-title">
            Sign in to manage your leagues
          </h2>
          <p style={{ margin: 0, color: "#475569" }}>
            Create an account with any email + password. Share links still work without signing in.
          </p>
      <form
        onSubmit={handleAuthSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}
      >
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "999px",
            border: "1px solid rgba(148, 163, 184, 0.7)",
            backgroundColor: "#f8fafc"
          }}
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password (min 6 characters)"
          required
          minLength={6}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "999px",
            border: "1px solid rgba(148, 163, 184, 0.7)",
            backgroundColor: "#f8fafc"
          }}
        />
        <button className="button" type="submit" disabled={authPending}>
          {authPending
            ? "Working…"
            : authMode === "sign-in"
            ? "Sign in"
            : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: "0.75rem", color: "#475569" }}>
        {authMode === "sign-in" ? "Need an account?" : "Already registered?"}{" "}
        <button
          type="button"
          onClick={() => {
            setAuthMode((mode) => (mode === "sign-in" ? "sign-up" : "sign-in"));
            setAuthFeedback(null);
            setAuthError(null);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#2563eb",
            fontWeight: 600,
            cursor: "pointer",
            padding: 0
          }}
        >
          {authMode === "sign-in" ? "Create one" : "Sign in"}
        </button>
      </p>
      {authFeedback && <p style={{ color: "#16a34a" }}>{authFeedback}</p>}
      {authError && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {authError}
        </p>
      )}
    </section>
  )}

      {session && !shareToken && (
        <section className="card" aria-labelledby="profile-heading" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h2 id="profile-heading" className="section-title">
                Your profile & leagues
              </h2>
              <p style={{ margin: 0, color: "#475569" }}>
                Signed in as <strong>{session.user.email}</strong>
              </p>
            </div>
            <button className="button button-secondary" type="button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>

          <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#1f2937" }}>
                Active league
              </label>
              <select
                value={selectedLeagueId ?? ""}
                onChange={(event) => setSelectedLeagueId(event.target.value || null)}
                disabled={leaguesLoading || leagues.length === 0}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(148, 163, 184, 0.7)",
                  backgroundColor: "#f8fafc"
                }}
              >
                {leagues.length === 0 ? (
                  <option value="">No leagues yet</option>
                ) : (
                  leagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                    </option>
                  ))
                )}
              </select>
              {leagueError && (
                <p style={{ marginTop: "0.5rem", color: "#dc2626" }} role="alert">
                  {leagueError}
                </p>
              )}
            </div>

            <form onSubmit={handleCreateLeague} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <label style={{ fontWeight: 600, color: "#1f2937" }}>Create a new league</label>
              <input
                type="text"
                value={newLeagueName}
                onChange={(event) => setNewLeagueName(event.target.value)}
                placeholder="League name"
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(148, 163, 184, 0.7)",
                  backgroundColor: "#f8fafc"
                }}
              />
              <button className="button" type="submit" disabled={createLeaguePending || !newLeagueName.trim()}>
                {createLeaguePending ? "Creating…" : "Add league"}
              </button>
            </form>
          </div>

          {shareToken && publicLeague && (
            <p style={{ marginTop: "1rem", color: "#475569" }}>
              You are viewing a public league. Clear the share link to return to your account view.
            </p>
          )}
        </section>
      )}

      {leagueAccess && apiConfig && (
        <>
          {shareToken && !publicLeagueError && (
            <section className="card" style={{ marginBottom: "1.5rem" }}>
              <p style={{ margin: 0, color: "#2563eb", fontWeight: 600 }}>
                Public league mode — anyone with this link can update scores.
              </p>
            </section>
          )}

          {stage === "roster" && (
            <RosterManager
              onRosterLoaded={handleRosterLoaded}
              onNext={() => setStage("setup")}
              isAdvancingAllowed={canAdvance}
              apiConfig={apiConfig}
            />
          )}

          {stage === "setup" && (
            <SessionSetup
              roster={roster}
              onStartGame={handleStartGame}
              onBack={() => setStage("roster")}
            />
          )}

          {stage === "game" && (
            <GameScreen
              players={gamePlayers}
              onPlayersChange={handlePlayersChange}
              onEndGame={handleEndGame}
              onBack={() => setStage("setup")}
            />
          )}

          {stage === "summary" && (
            <GameSummary
              players={gamePlayers}
              onSave={handleSaveSession}
              onReset={resetToRoster}
              saving={saveState.saving}
              lastError={saveState.error}
              history={history}
            />
          )}

          <HistoryLeaderboard history={history} onRefresh={loadHistory} loading={historyLoading} />
        </>
      )}

      {!leagueAccess && !shareToken && session && leagues.length === 0 && (
        <section className="card" style={{ marginTop: "1.5rem" }}>
          <p style={{ margin: 0, color: "#475569" }}>
            Create your first league above to unlock the scoretracker.
          </p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="app-shell">
          <p style={{ color: "#475569" }}>Loading league data…</p>
        </main>
      }
    >
      <PageContent />
    </Suspense>
  );
}
