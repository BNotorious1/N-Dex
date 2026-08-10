
export interface Member {
  id: number;
  league_id: number;
  /** @nullable */
  team_id?: number | null;
  discord_name: string;
  /** @nullable */
  gamer_tag?: string | null;
  permissions?: number;
  /** @nullable */
  discord_avatar_url?: string | null;
  /** @nullable */
  date_joined?: string | null;
}
