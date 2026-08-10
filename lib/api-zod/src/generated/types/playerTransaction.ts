
export interface PlayerTransaction {
  id: number;
  player_id: number;
  league_id: number;
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
