
export interface CreateLeagueTradeInput {
  season: number;
  week?: number;
  team_a_id: number;
  team_b_id: number;
  players_from_a: number[];
  players_from_b: number[];
  notes?: string;
}
