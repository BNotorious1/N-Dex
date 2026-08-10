
export interface JoinRequest {
  id: number;
  league_id: number;
  /** @nullable */
  team_id?: number | null;
  discord_name: string;
  /** @nullable */
  discord_id?: string | null;
  /** @nullable */
  gamer_tag?: string | null;
  /** @nullable */
  platform?: string | null;
  /** @nullable */
  message?: string | null;
  status: string;
  created_at: string;
}
