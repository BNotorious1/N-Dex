import { pgTable, serial, integer, real, unique } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { leaguesTable } from "./leagues";
import { gamesTable } from "./games";

export const playerGameStatsTable = pgTable("player_game_stats", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  gameId: integer("game_id").references(() => gamesTable.id, { onDelete: "set null" }),
  season: integer("season").notNull(),
  week: integer("week").notNull(),
  weekIndex: integer("week_index").notNull(),
  stageIndex: integer("stage_index").notNull(),
  // Passing
  pssAtt: integer("pss_att"),
  pssCmp: integer("pss_cmp"),
  pssYds: integer("pss_yds"),
  pssTds: integer("pss_tds"),
  pssInts: integer("pss_ints"),
  pssSacks: integer("pss_sacks"),
  pssLng: integer("pss_lng"),
  pssRating: real("pss_rating"),
  // Rushing
  rshAtt: integer("rsh_att"),
  rshYds: integer("rsh_yds"),
  rshTds: integer("rsh_tds"),
  rshLng: integer("rsh_lng"),
  rshBtk: integer("rsh_btk"),
  fmb: integer("fmb"),
  fmbLost: integer("fmb_lost"),
  // Receiving
  recCatches: integer("rec_catches"),
  recTgts: integer("rec_tgts"),
  recYds: integer("rec_yds"),
  recTds: integer("rec_tds"),
  recDrops: integer("rec_drops"),
  recLng: integer("rec_lng"),
  recYac: integer("rec_yac"),
  // Defense
  defTotalTackles: integer("def_total_tackles"),
  defTfl: real("def_tfl"),
  defSacks: real("def_sacks"),
  defInts: integer("def_ints"),
  defFf: integer("def_ff"),
  defPd: integer("def_pd"),
  defTds: integer("def_tds"),
  defFumRec: integer("def_fum_rec"),
  defCatchesAllowed: integer("def_catches_allowed"),
  defSafeties: integer("def_safeties"),
  // Kicking
  fgAtt: integer("fg_att"),
  fgMade: integer("fg_made"),
  fgLng: integer("fg_lng"),
  xpAtt: integer("xp_att"),
  xpMade: integer("xp_made"),
  // Punting
  puntAtt: integer("punt_att"),
  puntYds: integer("punt_yds"),
  puntAvg: integer("punt_avg"),
  puntLng: integer("punt_lng"),
  puntIn20: integer("punt_in20"),
  puntTbs: integer("punt_tbs"),
}, (table) => [
  unique("player_game_stats_player_week").on(table.playerId, table.weekIndex, table.stageIndex),
]);

export type PlayerGameStats = typeof playerGameStatsTable.$inferSelect;
