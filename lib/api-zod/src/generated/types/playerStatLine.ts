
import type { Player } from './player';

export interface PlayerStatLine {
  player: Player;
  team_name: string;
  team_id?: number;
  team_abbreviation?: string;
  /** @nullable */
  team_color?: string | null;
  stat_label: string;
  stat_value: number;
}
