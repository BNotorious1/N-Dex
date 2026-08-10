
export interface Player {
  id: number;
  team_id: number;
  name: string;
  /** QB, RB, WR, TE, OL, DL, LB, CB, S, K, P */
  position: string;
  overall: number;
  age: number;
  speed: number;
  strength: number;
  awareness: number;
  /** @nullable */
  throwing_power?: number | null;
  /** @nullable */
  catching?: number | null;
  /** @nullable */
  tackling?: number | null;
  /**
     * EA portrait CDN ID (used in portrait image URLs)
     * @nullable
     */
  portrait_id?: number | null;
  /**
     * Years in the league (0 = rookie)
     * @nullable
     */
  years_pro?: number | null;
}
