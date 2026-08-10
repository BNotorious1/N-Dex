
import type { LeagueStatsMetaWeeksBySeason } from './leagueStatsMetaWeeksBySeason';

export interface LeagueStatsMeta {
  seasons: number[];
  weeks_by_season: LeagueStatsMetaWeeksBySeason;
}
