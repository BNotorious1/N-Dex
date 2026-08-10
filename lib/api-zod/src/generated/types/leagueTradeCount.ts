
export interface LeagueTradeCount {
  team_id: number;
  team_name: string;
  team_abbreviation: string;
  /** @nullable */
  team_color?: string | null;
  pending: number;
  approved: number;
  denied: number;
  cancelled: number;
  total: number;
}
