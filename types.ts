export type Player = {
  id: string;
  name: string;
};

export type Stage = "roster" | "setup" | "game" | "summary";

export type TeamSide = "A" | "B";

export type GamePlayer = Player & {
  team: TeamSide;
  goals: number;
  assists: number;
};

export type TeamNames = Record<TeamSide, string>;

export type GoalEvent = {
  id: string;
  playerId: string;
  playerName: string;
  team: TeamSide;
  timestamp: string;
};

export type SessionPlayerPayload = {
  playerId: string;
  team: TeamSide;
  goals: number;
  assists: number;
  attendance: boolean;
  weekPoints: number;
};

export type SessionPayload = {
  teamAScore: number;
  teamBScore: number;
  winner: TeamSide | "Tie";
  players: SessionPlayerPayload[];
  goalEvents: GoalEvent[];
  teamNames?: TeamNames;
};

export type SavedSession = {
  id: string;
  createdAt: string;
  teamAScore: number;
  teamBScore: number;
  winner: TeamSide | "Tie";
  goalEvents: GoalEvent[];
  teamNames?: TeamNames;
  players: Array<
    SessionPlayerPayload & {
      playerName: string;
    }
  >;
};

export type LeagueRole = "admin" | "member";

export type League = {
  id: string;
  name: string;
  publicToken: string;
  role: LeagueRole;
  attendancePoints: number;
  goalPoints: number;
  winBonus: number;
  enableAssists: boolean;
  assistPoints: number;
};

export type LeagueSummary = {
  id: string;
  name: string;
  publicToken: string;
  attendancePoints: number;
  goalPoints: number;
  winBonus: number;
  enableAssists: boolean;
  assistPoints: number;
};

export type LeagueAccess =
  | {
      type: "authenticated";
      league: League;
      accessToken: string;
    }
  | {
      type: "public";
      league: LeagueSummary;
    };

export type LiveGameState = {
  stage: Stage;
  selectedPlayerIds: string[];
  assignments: Record<string, TeamSide>;
  gamePlayers: GamePlayer[];
  teamNames: TeamNames;
  goalEvents: GoalEvent[];
  secondsElapsed: number;
  isTimerRunning: boolean;
  timerOwnerId: string | null;
  alarmAtSeconds: number | null;
  alarmAcknowledged: boolean;
  lastUpdated: number;
};

export const emptyLiveGameState: LiveGameState = {
  stage: "roster",
  selectedPlayerIds: [],
  assignments: {},
  gamePlayers: [],
  teamNames: { A: "Team A", B: "Team B" },
  goalEvents: [],
  secondsElapsed: 0,
  isTimerRunning: false,
  timerOwnerId: null,
  alarmAtSeconds: null,
  alarmAcknowledged: false,
  lastUpdated: 0
};

export type ScoringConfig = {
  attendancePoints: number;
  goalPoints: number;
  winBonus: number;
  enableAssists: boolean;
  assistPoints: number;
};
