
import type { Team } from './team';

export interface StandingEntry {
  team: Team;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  conference: string;
  division: string;
}
