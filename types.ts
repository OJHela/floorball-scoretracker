export type Player = {
  id: string;
  name: string;
};

export type TeamSide = "A" | "B";

export type GamePlayer = Player & {
  team: TeamSide;
  goals: number;
};

export type SessionPlayerPayload = {
  playerId: string;
  team: TeamSide;
  goals: number;
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
};

export type LeagueSummary = {
  id: string;
  name: string;
  publicToken: string;
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
