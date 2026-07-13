import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: text("position").notNull(),
  overall: integer("overall").notNull().default(75),
  age: integer("age").notNull().default(25),
  devTrait: integer("dev_trait"),
  yearsPro: integer("years_pro"),
  rookieYear: integer("rookie_year"),
  draftRound: integer("draft_round"),
  draftPick: integer("draft_pick"),
  eaPlayerId: text("ea_player_id"),
  presentationId: integer("presentation_id"),
  portraitId: integer("portrait_id"),
  birthYear: integer("birth_year"),
  birthMonth: integer("birth_month"),
  birthDay: integer("birth_day"),

  // ── Physical / Athletic ──────────────────────────────────────────────────
  speed: integer("speed").notNull().default(75),
  acceleration: integer("acceleration"),
  agility: integer("agility"),
  strength: integer("strength").notNull().default(70),
  stamina: integer("stamina"),
  injury: integer("injury"),
  toughness: integer("toughness"),
  jumping: integer("jumping"),

  // ── Mental ───────────────────────────────────────────────────────────────
  awareness: integer("awareness").notNull().default(72),
  confidence: integer("confidence"),
  playRecognition: integer("play_recognition"),

  // ── Passing ──────────────────────────────────────────────────────────────
  throwingPower: integer("throwing_power"),
  throwAccuracy: integer("throw_accuracy"),
  throwAccuracyShort: integer("throw_accuracy_short"),
  throwAccuracyMid: integer("throw_accuracy_mid"),
  throwAccuracyDeep: integer("throw_accuracy_deep"),
  throwOnRun: integer("throw_on_run"),
  throwUnderPressure: integer("throw_under_pressure"),
  playAction: integer("play_action"),
  breakSack: integer("break_sack"),

  // ── Receiving ────────────────────────────────────────────────────────────
  catching: integer("catching"),
  catchInTraffic: integer("catch_in_traffic"),
  spectacularCatch: integer("spectacular_catch"),
  routeRunShort: integer("route_run_short"),
  routeRunMid: integer("route_run_mid"),
  routeRunDeep: integer("route_run_deep"),
  release: integer("release"),

  // ── Ball Carrying ────────────────────────────────────────────────────────
  carrying: integer("carrying"),
  ballCarrierVision: integer("ball_carrier_vision"),
  breakTackle: integer("break_tackle"),
  stiffArm: integer("stiff_arm"),
  spinMove: integer("spin_move"),
  jukeMove: integer("juke_move"),
  trucking: integer("trucking"),
  changeOfDirection: integer("change_of_direction"),

  // ── Blocking ─────────────────────────────────────────────────────────────
  runBlock: integer("run_block"),
  runBlockPower: integer("run_block_power"),
  runBlockFinesse: integer("run_block_finesse"),
  passBlock: integer("pass_block"),
  passBlockPower: integer("pass_block_power"),
  passBlockFinesse: integer("pass_block_finesse"),
  impactBlock: integer("impact_block"),
  leadBlock: integer("lead_block"),

  // ── Defense ──────────────────────────────────────────────────────────────
  tackling: integer("tackling"),
  hitPower: integer("hit_power"),
  pursuit: integer("pursuit"),
  blockShed: integer("block_shed"),
  finesseMoves: integer("finesse_moves"),
  powerMoves: integer("power_moves"),
  manCoverage: integer("man_coverage"),
  zoneCoverage: integer("zone_coverage"),
  press: integer("press"),

  // ── Special Teams ────────────────────────────────────────────────────────
  kickAccuracy: integer("kick_accuracy"),
  kickPower: integer("kick_power"),
  kickReturn: integer("kick_return"),
  longSnap: integer("long_snap"),

  // ── Traits ───────────────────────────────────────────────────────────────
  clutchTrait: integer("clutch_trait"),
  highMotorTrait: integer("high_motor_trait"),
  penaltyTrait: integer("penalty_trait"),
  predictTrait: integer("predict_trait"),
  decisionMakerTrait: integer("decision_maker_trait"),
  qbStyleTrait: integer("qb_style_trait"),
  forcePassTrait: integer("force_pass_trait"),
  sensePressureTrait: integer("sense_pressure_trait"),
  throwAwayTrait: integer("throw_away_trait"),
  tightSpiralTrait: integer("tight_spiral_trait"),
  coverBallTrait: integer("cover_ball_trait"),
  fightForYardsTrait: integer("fight_for_yards_trait"),
  runStyle: integer("run_style"),
  feetInBoundsTrait: integer("feet_in_bounds_trait"),
  hpCatchTrait: integer("hp_catch_trait"),
  playBallTrait: integer("play_ball_trait"),
  posCatchTrait: integer("pos_catch_trait"),
  yacCatchTrait: integer("yac_catch_trait"),
  dropOpenPassTrait: integer("drop_open_pass_trait"),
  bigHitTrait: integer("big_hit_trait"),
  stripBallTrait: integer("strip_ball_trait"),
  dlBullRushTrait: integer("dl_bull_rush_trait"),
  dlSpinTrait: integer("dl_spin_trait"),
  dlSwimTrait: integer("dl_swim_trait"),
  lbStyleTrait: integer("lb_style_trait"),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
