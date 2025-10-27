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
};

export type SavedSession = {
  id: string;
  createdAt: string;
  teamAScore: number;
  teamBScore: number;
  winner: TeamSide | "Tie";
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
  secondsElapsed: number;
  isTimerRunning: boolean;
  timerOwnerId: string | null;
  alarmAtSeconds: number | null;
  alarmAcknowledged: boolean;
};

export const emptyLiveGameState: LiveGameState = {
  stage: "roster",
  selectedPlayerIds: [],
  assignments: {},
  gamePlayers: [],
  secondsElapsed: 0,
  isTimerRunning: false,
  timerOwnerId: null,
  alarmAtSeconds: null,
  alarmAcknowledged: false
};

export type ScoringConfig = {
  attendancePoints: number;
  goalPoints: number;
  winBonus: number;
  enableAssists: boolean;
  assistPoints: number;
};
