
export interface Game {
  id: number;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  /** @nullable */
  home_team_name?: string | null;
  /** @nullable */
  away_team_name?: string | null;
  /** @nullable */
  home_score?: number | null;
  /** @nullable */
  away_score?: number | null;
  week: number;
  season: number;
  /** SCHEDULED, IN_PROGRESS, COMPLETED */
  status: string;
}
