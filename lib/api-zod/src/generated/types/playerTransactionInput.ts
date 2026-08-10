
export interface PlayerTransactionInput {
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
}
