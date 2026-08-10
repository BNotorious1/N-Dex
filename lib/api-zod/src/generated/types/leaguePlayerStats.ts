
import type { PlayerSeasonStats } from './playerSeasonStats';

export interface LeaguePlayerStats {
  passing: PlayerSeasonStats[];
  rushing: PlayerSeasonStats[];
  receiving: PlayerSeasonStats[];
  defense: PlayerSeasonStats[];
  kicking: PlayerSeasonStats[];
  punting: PlayerSeasonStats[];
}
