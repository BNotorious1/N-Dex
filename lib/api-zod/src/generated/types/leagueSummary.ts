
import type { Game } from './game';
import type { League } from './league';
import type { Team } from './team';

export interface LeagueSummary {
  league: League;
  top_teams: Team[];
  recent_games: Game[];
  total_teams: number;
  total_games_played: number;
  current_week: number;
}
