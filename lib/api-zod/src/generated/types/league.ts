
export interface League {
  id: number;
  name: string;
  commissioner_name: string;
  /** PS5, Xbox, PC */
  platform: string;
  /** ALL_MADDEN, ALL_PRO, PRO, ROOKIE */
  difficulty: string;
  /** REGULAR, FANTASY */
  category: string;
  /** BEGINNER, INTERMEDIATE, ADVANCED */
  skill_level: string;
  advance_time_hours: number;
  week: number;
  season: number;
  /** PRE_SEASON, REGULAR_SEASON, POST_SEASON, SUPER_BOWL */
  phase: string;
  member_count: number;
  max_members: number;
  is_cross_play: boolean;
  is_money_league: boolean;
  /** @nullable */
  description?: string | null;
  created_at: string;
}
