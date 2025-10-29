"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useSearchParams } from "next/navigation";
import { GameScreen } from "../components/GameScreen";
import { GameSummary } from "../components/GameSummary";
import { HistoryLeaderboard } from "../components/HistoryLeaderboard";
import { RosterManager } from "../components/RosterManager";
import { SessionSetup } from "../components/SessionSetup";
import { useSupabaseClient, useSupabaseSession } from "../components/SupabaseProvider";
import { buildWeeklyPoints } from "../lib/scoring";
import {
  emptyLiveGameState,
  type GamePlayer,
  type GoalEvent,
  type League,
  type LeagueAccess,
  type LeagueSummary,
  type LiveGameState,
  type Player,
  type SavedSession,
  type ScoringConfig
} from "../types";

type LeagueApiConfig = {
  playersUrl: string;
  playerDetailUrl: (playerId: string) => string;
  sessionsUrl: string;
  liveGameUrl: string;
  headers?: Record<string, string>;
};

function PageContent() {
  const searchParams = useSearchParams();
  const shareToken = searchParams.get("token");

  const supabase = useSupabaseClient();
  const { session, sessionLoading } = useSupabaseSession();

  const [roster, setRoster] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<LiveGameState>({ ...emptyLiveGameState });
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
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const updatingFromRemoteRef = useRef(false);
  const persistQueueRef = useRef<LiveGameState | null>(null);
  const pendingSessionRef = useRef<{ players: GamePlayer[]; goalEvents: GoalEvent[] } | null>(null);
  const clientIdRef = useRef<string>("");
  if (!clientIdRef.current) {
    clientIdRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
  }

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
      } satisfies LeagueAccess;
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
      liveGameUrl: `/api/live-game?${query}`,
      headers
    } satisfies LeagueApiConfig;
  }, [leagueAccess]);

  const scoringConfig: ScoringConfig = useMemo(
    () => ({
      attendancePoints: leagueAccess?.league.attendancePoints ?? 1,
      goalPoints: leagueAccess?.league.goalPoints ?? 1,
      winBonus: leagueAccess?.league.winBonus ?? 5,
      enableAssists: leagueAccess?.league.enableAssists ?? false,
      assistPoints: leagueAccess?.league.assistPoints ?? 1
    }),
    [leagueAccess]
  );

  useEffect(() => {
    if (!leagueAccess) {
      setShareUrl("");
      return;
    }

    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    const origin =
      envUrl && envUrl.length > 0
        ? envUrl.replace(/\/$/, "")
        : typeof window !== "undefined"
        ? window.location.origin
        : "";

    if (!origin) return;
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
        updatingFromRemoteRef.current = true;
        setGameState({ ...emptyLiveGameState });
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
      if (current && leagues.some((league) => league.id === current)) {
        return current;
      }
      return leagues[0].id;
    });
  }, [leagues, session, shareToken]);

  useEffect(() => {
    if (!apiConfig) return;
    loadHistory().catch(() => setHistoryLoading(false));
  }, [apiConfig, loadHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const applyRemoteState = useCallback((state: LiveGameState) => {
    setGameState((prev) => {
      const incomingTimestamp =
        typeof state.lastUpdated === "number" && Number.isFinite(state.lastUpdated) ? state.lastUpdated : Date.now();
      if (incomingTimestamp < prev.lastUpdated) {
        updatingFromRemoteRef.current = false;
        return prev;
      }

      updatingFromRemoteRef.current = true;
      return {
        ...prev,
        ...state,
        selectedPlayerIds: [...state.selectedPlayerIds],
        assignments: { ...state.assignments },
        gamePlayers: state.gamePlayers.map((player) => ({ ...player })),
        teamNames: { A: state.teamNames.A, B: state.teamNames.B },
        goalEvents: state.goalEvents.map((event) => ({ ...event })),
        lastUpdated: incomingTimestamp
      };
    });
  }, []);

  const persistState = useCallback(
    (state: LiveGameState) => {
      if (!apiConfig?.liveGameUrl) return;
      if (!isOnline) {
        persistQueueRef.current = state;
        return;
      }
      fetch(apiConfig.liveGameUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(apiConfig.headers ?? {})
        },
        body: JSON.stringify({ state })
      }).catch(() => {
        persistQueueRef.current = state;
      });
    },
    [apiConfig, isOnline]
  );

  const scheduleLocalUpdate = useCallback(
    (updater: (prev: LiveGameState) => LiveGameState) => {
      setGameState((prev) => {
        const next = updater(prev);
        const stamped = { ...next, lastUpdated: Date.now() };
        persistQueueRef.current = stamped;
        return stamped;
      });
    },
    []
  );

  useEffect(() => {
    if (!isOnline) return;
    if (!persistQueueRef.current) return;
    const queued = persistQueueRef.current;
    persistQueueRef.current = null;
    persistState(queued);
  }, [isOnline, persistState]);

  useEffect(() => {
    if (updatingFromRemoteRef.current) {
      updatingFromRemoteRef.current = false;
      persistQueueRef.current = null;
      return;
    }

    if (!persistQueueRef.current) return;
    const next = persistQueueRef.current;
    persistQueueRef.current = null;
    persistState(next);
  }, [gameState, persistState]);

  useEffect(() => {
    if (!apiConfig?.liveGameUrl || !isOnline) return;
    let cancelled = false;

    fetch(apiConfig.liveGameUrl, {
      cache: "no-store",
      headers: apiConfig.headers
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as { state: LiveGameState };
        if (!cancelled && payload.state) {
          applyRemoteState(payload.state);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [apiConfig, applyRemoteState, isOnline]);

  useEffect(() => {
    if (!leagueAccess || !isOnline) return;

    const channel = supabase
      .channel(`live-game-${leagueAccess.league.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_games",
          filter: `league_id=eq.${leagueAccess.league.id}`
        },
        (payload) => {
          const raw = (payload.new as { state?: unknown } | null) ?? null;
          const state = raw?.state ? (raw.state as LiveGameState) : null;
          if (state) {
            applyRemoteState(state);
          } else if (payload.eventType === "DELETE") {
            applyRemoteState({ ...emptyLiveGameState });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyRemoteState, leagueAccess, supabase, isOnline]);

  const canAdvance = useMemo(() => roster.length >= 2, [roster.length]);
  const canManageSessions = leagueAccess?.type === "authenticated" && leagueAccess.league.role === "admin";

  const handleRosterLoaded = useCallback((players: Player[]) => {
    setRoster(players);
  }, []);

  const handleStartGame = useCallback(
    (players: GamePlayer[]) => {
      scheduleLocalUpdate((prev) => ({
        ...prev,
        stage: "game",
        gamePlayers: players.map((player) => ({
          ...player,
          assists: player.assists ?? 0
        })),
        teamNames: { ...prev.teamNames },
        goalEvents: [],
        secondsElapsed: 0,
        isTimerRunning: false,
        timerOwnerId: null,
        alarmAcknowledged: false
      }));
    },
    [scheduleLocalUpdate]
  );

  const handleTeamNamesChange = useCallback(
    (team: "A" | "B", name: string) => {
      scheduleLocalUpdate((prev) => ({
        ...prev,
        teamNames: {
          ...prev.teamNames,
          [team]: name
        }
      }));
    },
    [scheduleLocalUpdate]
  );

  const handleGoalAdjust = useCallback(
    (playerId: string, delta: number) => {
      if (!delta) return;
      scheduleLocalUpdate((prev) => {
        const nextPlayers = prev.gamePlayers.map((player) => {
          if (player.id !== playerId) return { ...player };
          const nextGoals = Math.max(0, player.goals + delta);
          return { ...player, goals: nextGoals };
        });

        const targetBefore = prev.gamePlayers.find((player) => player.id === playerId);
        if (!targetBefore) {
          return { ...prev, gamePlayers: nextPlayers };
        }

        const targetAfter = nextPlayers.find((player) => player.id === playerId) ?? targetBefore;
        const events = [...prev.goalEvents];

        if (delta > 0) {
          const additions = Array.from({ length: delta }, () => {
            const id =
              typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${playerId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            return {
              id,
              playerId,
              playerName: targetAfter.name,
              team: targetAfter.team,
              timestamp: new Date().toISOString()
            } satisfies GoalEvent;
          });
          events.push(...additions);
        } else {
          let removalsNeeded = Math.min(
            -delta,
            events.reduce((count, event) => (event.playerId === playerId ? count + 1 : count), 0)
          );
          if (removalsNeeded > 0) {
            for (let index = events.length - 1; index >= 0 && removalsNeeded > 0; index -= 1) {
              if (events[index].playerId !== playerId) continue;
              events.splice(index, 1);
              removalsNeeded -= 1;
            }
          }
        }

        return {
          ...prev,
          gamePlayers: nextPlayers.map((player) => ({
            ...player,
            assists: player.assists ?? 0
          })),
          goalEvents: events
        };
      });
    },
    [scheduleLocalUpdate]
  );

  const handleAssignPlayerTeam = useCallback(
    (playerId: string, nextTeam: "A" | "B") => {
      scheduleLocalUpdate((prev) => {
        const currentPlayer = prev.gamePlayers.find((player) => player.id === playerId);
        if (!currentPlayer || currentPlayer.team === nextTeam) {
          return prev;
        }

        const nextPlayers = prev.gamePlayers.map((player) =>
          player.id === playerId ? { ...player, team: nextTeam } : { ...player }
        );

        const updatedEvents = prev.goalEvents.map((event) =>
          event.playerId === playerId ? { ...event, team: nextTeam } : { ...event }
        );

        const updatedAssignments = { ...prev.assignments, [playerId]: nextTeam };

        return {
          ...prev,
          gamePlayers: nextPlayers,
          goalEvents: updatedEvents,
          assignments: updatedAssignments
        };
      });
    },
    [scheduleLocalUpdate]
  );

  const handleAssistAdjust = useCallback(
    (playerId: string, delta: number) => {
      if (!delta) return;
      scheduleLocalUpdate((prev) => ({
        ...prev,
        gamePlayers: prev.gamePlayers.map((player) =>
          player.id === playerId
            ? {
                ...player,
                assists: Math.max(0, (player.assists ?? 0) + delta)
              }
            : { ...player }
        )
      }));
    },
    [scheduleLocalUpdate]
  );

  const submitSession = useCallback(
    async (players: GamePlayer[], goalEvents: GoalEvent[], allowQueue = true) => {
      if (!apiConfig) return;
      const snapshot = players.map((player) => ({ ...player }));
      const eventsSnapshot = goalEvents.map((event) => ({ ...event }));
      const { payload, teamScores, winner } = buildWeeklyPoints(snapshot, scoringConfig);

      if (!isOnline) {
        if (allowQueue) {
          pendingSessionRef.current = { players: snapshot, goalEvents: eventsSnapshot };
          setSaveState({ saving: false, error: "Saved locally. Will sync when back online." });
        }
        return;
      }

      setSaveState({ saving: true, error: null });
      try {
        const response = await fetch(apiConfig.sessionsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(apiConfig.headers ?? {}) },
          body: JSON.stringify({
            teamAScore: teamScores.A,
            teamBScore: teamScores.B,
            winner,
            players: payload,
            goalEvents: eventsSnapshot
          })
        });

        if (!response.ok) {
          const message = (await response.json().catch(() => ({})))?.error ?? "Failed to save session";
          throw new Error(message);
        }

        await loadHistory();
        pendingSessionRef.current = null;
        setSaveState({ saving: false, error: null });
      } catch (error) {
        if (allowQueue) pendingSessionRef.current = { players: snapshot, goalEvents: eventsSnapshot };
        const message = error instanceof Error ? error.message : "Failed to save session";
        setSaveState({ saving: false, error: message });
      }
    },
    [apiConfig, isOnline, loadHistory, scoringConfig]
  );

  const handleEndGame = useCallback(
    (players: GamePlayer[]) => {
      const finalizedPlayers = players.map((player) => ({
        ...player,
        assists: player.assists ?? 0
      }));
      const finalizedEvents = gameState.goalEvents.map((event) => ({ ...event }));
      const teamNames = { ...gameState.teamNames };

      scheduleLocalUpdate((prev) => ({
        ...prev,
        stage: "summary",
        gamePlayers: finalizedPlayers,
        teamNames,
        goalEvents: finalizedEvents,
        alarmAtSeconds: null,
        alarmAcknowledged: false
      }));
      submitSession(finalizedPlayers, finalizedEvents);
    },
    [gameState.goalEvents, gameState.teamNames, scheduleLocalUpdate, submitSession]
  );

  useEffect(() => {
    if (!isOnline) return;
    if (!pendingSessionRef.current) return;
    const snapshot = pendingSessionRef.current;
    pendingSessionRef.current = null;
    submitSession(snapshot.players, snapshot.goalEvents, false);
  }, [isOnline, submitSession]);

  const resetToRoster = useCallback(() => {
    scheduleLocalUpdate(() => ({ ...emptyLiveGameState }));
  }, [scheduleLocalUpdate]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!apiConfig) return;
      if (leagueAccess?.type !== "authenticated") return;
      if (!window.confirm("Remove this session? This cannot be undone.")) return;

      setDeletingSessionId(sessionId);
      try {
        const response = await fetch(`/api/sessions/${sessionId}?leagueId=${leagueAccess.league.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${leagueAccess.accessToken}`
          }
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          alert(payload.error ?? "Failed to delete session");
          return;
        }

        setHistory((current) => current.filter((session) => session.id !== sessionId));
      } finally {
        setDeletingSessionId(null);
      }
    },
    [apiConfig, leagueAccess]
  );

  const toggleSelection = useCallback(
    (playerId: string) => {
      scheduleLocalUpdate((prev) => {
        const isSelected = prev.selectedPlayerIds.includes(playerId);
        const selected = isSelected
          ? prev.selectedPlayerIds.filter((id) => id !== playerId)
          : [...prev.selectedPlayerIds, playerId];

        const assignments = { ...prev.assignments } as Record<string, "A" | "B">;
        if (isSelected) {
          delete assignments[playerId];
        } else if (!assignments[playerId]) {
          assignments[playerId] = "A";
        }

        return {
          ...prev,
          selectedPlayerIds: selected,
          assignments
        };
      });
    },
    [scheduleLocalUpdate]
  );

  const toggleTeam = useCallback(
    (playerId: string) => {
      scheduleLocalUpdate((prev) => ({
        ...prev,
        assignments: {
          ...prev.assignments,
          [playerId]: prev.assignments[playerId] === "A" ? "B" : "A"
        }
      }));
    },
    [scheduleLocalUpdate]
  );

  const goToSetup = useCallback(() => {
    scheduleLocalUpdate((prev) => ({ ...prev, stage: "setup", alarmAcknowledged: false }));
  }, [scheduleLocalUpdate]);

  const goToRoster = useCallback(() => {
    scheduleLocalUpdate((prev) => ({ ...prev, stage: "roster", alarmAcknowledged: false }));
  }, [scheduleLocalUpdate]);

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
              <button className="button button-secondary" type="button" onClick={copyShareLink} style={{ width: "100%" }}>
                Copy Share Link
              </button>
              {shareCopyMessage && <span style={{ color: "#16a34a", fontSize: "0.85rem" }}>{shareCopyMessage}</span>}
            </div>
          )}
        </div>
      </header>

      {!isOnline && (
        <section className="card" style={{ marginBottom: "1rem", borderColor: "#f97316" }}>
          <p style={{ margin: 0, color: "#f97316", fontWeight: 600 }}>
            Offline mode – changes will sync when you reconnect.
          </p>
        </section>
      )}

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
              {authPending ? "Working…" : authMode === "sign-in" ? "Sign in" : "Create account"}
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

          <div
            style={{ marginTop: "1.5rem", display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          >
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

      {leagues.some((league) => league.role === "admin") && !shareToken && (
        <div style={{ marginTop: "1rem" }}>
          <Link className="button button-secondary" href="/settings">
            Adjust scoring rules
          </Link>
        </div>
      )}

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

          {gameState.stage === "roster" && (
            <RosterManager
              onRosterLoaded={handleRosterLoaded}
              onNext={goToSetup}
              isAdvancingAllowed={canAdvance}
              apiConfig={apiConfig}
            />
          )}

          {gameState.stage === "setup" && (
            <SessionSetup
              roster={roster}
              selectedPlayerIds={gameState.selectedPlayerIds}
              assignments={gameState.assignments}
              teamNames={gameState.teamNames}
              onToggleSelection={toggleSelection}
              onToggleTeam={toggleTeam}
              onTeamNamesChange={handleTeamNamesChange}
              onStartGame={handleStartGame}
              onBack={goToRoster}
            />
          )}

          {gameState.stage === "game" && (
            <GameScreen
              players={gameState.gamePlayers}
              teamNames={gameState.teamNames}
              goalEvents={gameState.goalEvents}
              onAdjustGoal={handleGoalAdjust}
              onAdjustAssist={handleAssistAdjust}
              onAssignTeam={handleAssignPlayerTeam}
              onTeamNamesChange={handleTeamNamesChange}
              onEndGame={handleEndGame}
              onBack={goToSetup}
              enableAssists={scoringConfig.enableAssists}
            />
          )}

          {gameState.stage === "summary" && (
            <GameSummary
              players={gameState.gamePlayers}
              goalEvents={gameState.goalEvents}
              teamNames={gameState.teamNames}
              onReset={resetToRoster}
              saving={saveState.saving}
              lastError={saveState.error}
          history={history}
          scoringConfig={scoringConfig}
            />
          )}

      <HistoryLeaderboard
        history={history}
        onRefresh={loadHistory}
        loading={historyLoading}
        canDelete={Boolean(canManageSessions)}
        onDeleteSession={canManageSessions ? handleDeleteSession : undefined}
        deletingId={deletingSessionId}
      />
        </>
      )}

      {!leagueAccess && !shareToken && session && leagues.length === 0 && (
        <section className="card" style={{ marginTop: "1.5rem" }}>
          <p style={{ margin: 0, color: "#475569" }}>Create your first league above to unlock the scoretracker.</p>
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
