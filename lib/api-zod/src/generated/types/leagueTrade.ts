
import type { LeagueTradePlayersFromAItem } from './leagueTradePlayersFromAItem';
import type { LeagueTradePlayersFromBItem } from './leagueTradePlayersFromBItem';
import type { LeagueTradeTeamA } from './leagueTradeTeamA';
import type { LeagueTradeTeamB } from './leagueTradeTeamB';

export interface LeagueTrade {
  id: number;
  league_id: number;
  season: number;
  /** @nullable */
  week?: number | null;
  status: string;
  team_a: LeagueTradeTeamA;
  team_b: LeagueTradeTeamB;
  players_from_a: LeagueTradePlayersFromAItem[];
  players_from_b: LeagueTradePlayersFromBItem[];
  /** @nullable */
  notes?: string | null;
  created_at: string;
}
