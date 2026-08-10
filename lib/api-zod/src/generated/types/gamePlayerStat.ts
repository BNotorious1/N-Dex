
export interface GamePlayerStat {
  player_id: number;
  player_name: string;
  position: string;
  /** @nullable */
  portrait_id?: number | null;
  /** @nullable */
  team_id?: number | null;
  is_home_team: boolean;
  /** @nullable */
  pss_att?: number | null;
  /** @nullable */
  pss_cmp?: number | null;
  /** @nullable */
  pss_yds?: number | null;
  /** @nullable */
  pss_tds?: number | null;
  /** @nullable */
  pss_ints?: number | null;
  /** @nullable */
  pss_sacks?: number | null;
  /** @nullable */
  pss_lng?: number | null;
  /** @nullable */
  pss_rating?: number | null;
  /** @nullable */
  rsh_att?: number | null;
  /** @nullable */
  rsh_yds?: number | null;
  /** @nullable */
  rsh_tds?: number | null;
  /** @nullable */
  rsh_lng?: number | null;
  /** @nullable */
  rsh_btk?: number | null;
  /** @nullable */
  fmb?: number | null;
  /** @nullable */
  fmb_lost?: number | null;
  /** @nullable */
  rec_catches?: number | null;
  /** @nullable */
  rec_tgts?: number | null;
  /** @nullable */
  rec_yds?: number | null;
  /** @nullable */
  rec_tds?: number | null;
  /** @nullable */
  rec_drops?: number | null;
  /** @nullable */
  rec_lng?: number | null;
  /** @nullable */
  rec_yac?: number | null;
  /** @nullable */
  def_total_tackles?: number | null;
  /** @nullable */
  def_tfl?: number | null;
  /** @nullable */
  def_sacks?: number | null;
  /** @nullable */
  def_ints?: number | null;
  /** @nullable */
  def_ff?: number | null;
  /** @nullable */
  def_pd?: number | null;
  /** @nullable */
  def_tds?: number | null;
  /** @nullable */
  def_fum_rec?: number | null;
  /** @nullable */
  def_catches_allowed?: number | null;
  /** @nullable */
  def_safeties?: number | null;
  /** @nullable */
  fg_att?: number | null;
  /** @nullable */
  fg_made?: number | null;
  /** @nullable */
  fg_lng?: number | null;
  /** @nullable */
  xp_att?: number | null;
  /** @nullable */
  xp_made?: number | null;
  /** @nullable */
  punt_att?: number | null;
  /** @nullable */
  punt_yds?: number | null;
  /** @nullable */
  punt_avg?: number | null;
  /** @nullable */
  punt_lng?: number | null;
  /** @nullable */
  punt_in20?: number | null;
  /** @nullable */
  punt_tbs?: number | null;
}
