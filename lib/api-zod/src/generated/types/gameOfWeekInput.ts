
export interface GameOfWeekInput {
  week: number;
  season: number;
  /** @nullable */
  home_team_id?: number | null;
  /** @nullable */
  away_team_id?: number | null;
  /** @nullable */
  headline?: string | null;
  /** @nullable */
  description?: string | null;
  /** @nullable */
  kickoff?: string | null;
}
