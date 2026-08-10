
import type { PlayerStatLine } from './playerStatLine';

export interface StatLeaders {
  passing: PlayerStatLine[];
  rushing: PlayerStatLine[];
  receiving: PlayerStatLine[];
  defense: PlayerStatLine[];
  tackles?: PlayerStatLine[];
  sacks?: PlayerStatLine[];
  interceptions?: PlayerStatLine[];
}
