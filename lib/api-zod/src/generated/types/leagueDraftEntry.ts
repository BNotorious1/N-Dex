
export interface LeagueDraftEntry {
  player_id: number;
  name: string;
  position: string;
  overall: number;
  age: number;
  /** @nullable */
  dev_trait?: number | null;
  /** @nullable */
  portrait_id?: number | null;
  /** @nullable */
  draft_round?: number | null;
  /** @nullable */
  draft_pick?: number | null;
  /** @nullable */
  rookie_year?: number | null;
  /** @nullable */
  years_pro?: number | null;
  team_id: number;
  team_name: string;
  team_abbreviation: string;
  /** @nullable */
  team_color?: string | null;
}
