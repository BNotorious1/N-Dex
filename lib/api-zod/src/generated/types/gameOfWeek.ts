
import type { Team } from './team';

export interface GameOfWeek {
  id: number;
  league_id: number;
  week: number;
  season: number;
  /** @nullable */
  home_team_id?: number | null;
  /** @nullable */
  away_team_id?: number | null;
  home_team?: Team | null;
  away_team?: Team | null;
  /** @nullable */
  headline?: string | null;
  /** @nullable */
  description?: string | null;
  /** @nullable */
  kickoff?: string | null;
  created_at: string;
}
