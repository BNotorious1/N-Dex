
import type { LeagueTransactionPlayer } from './leagueTransactionPlayer';
import type { LeagueTransactionTeam } from './leagueTransactionTeam';

export interface LeagueTransaction {
  id: number;
  player: LeagueTransactionPlayer;
  team: LeagueTransactionTeam;
  season: number;
  /** @nullable */
  week?: number | null;
  transaction_type: string;
  /** @nullable */
  from_team?: string | null;
  /** @nullable */
  to_team?: string | null;
  /** @nullable */
  notes?: string | null;
  created_at: string;
}
