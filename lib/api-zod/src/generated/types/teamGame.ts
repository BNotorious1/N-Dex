
import type { Game } from './game';

export type TeamGame = Game & ({
  /** @nullable */
  home_team_name?: string | null;
  /** @nullable */
  away_team_name?: string | null;
  /** @nullable */
  home_team_abbreviation?: string | null;
  /** @nullable */
  away_team_abbreviation?: string | null;
  /** @nullable */
  home_team_color?: string | null;
  /** @nullable */
  away_team_color?: string | null;
});
