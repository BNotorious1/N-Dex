
import type { GamePlayerStat } from './gamePlayerStat';

export interface GameDetail {
  id: number;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  /** @nullable */
  home_team_name?: string | null;
  /** @nullable */
  away_team_name?: string | null;
  /** @nullable */
  home_team_abbreviation?: string | null;
  /** @nullable */
  away_team_abbreviation?: string | null;
  /** @nullable */
  home_team_color?: string | null;
  /** @nullable */
  away_team_color?: string | null;
  /** @nullable */
  home_team_city?: string | null;
  /** @nullable */
  away_team_city?: string | null;
  /** @nullable */
  home_team_wins?: number | null;
  /** @nullable */
  away_team_wins?: number | null;
  /** @nullable */
  home_team_losses?: number | null;
  /** @nullable */
  away_team_losses?: number | null;
  /** @nullable */
  home_member_discord?: string | null;
  /** @nullable */
  away_member_discord?: string | null;
  /** @nullable */
  home_score?: number | null;
  /** @nullable */
  away_score?: number | null;
  week: number;
  season: number;
  status: string;
  player_stats: GamePlayerStat[];
}
