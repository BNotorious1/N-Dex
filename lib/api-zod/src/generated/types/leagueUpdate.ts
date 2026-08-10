
export interface LeagueUpdate {
  name?: string;
  platform?: string;
  difficulty?: string;
  category?: string;
  skill_level?: string;
  advance_time_hours?: number;
  max_members?: number;
  week?: number;
  season?: number;
  phase?: string;
  member_count?: number;
  is_cross_play?: boolean;
  is_money_league?: boolean;
  description?: string;
}
