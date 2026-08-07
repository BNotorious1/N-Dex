import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const AWARD_TYPES = [
  // Yearly – legacy conference-split
  "MVP",
  "AFC_OPOY",
  "NFC_OPOY",
  "AFC_DPOY",
  "NFC_DPOY",
  "AFC_DROY",
  "NFC_DROY",
  "AFC_OROY",
  "NFC_OROY",
  // Yearly – league-wide (new)
  "DPOY",
  "OROY",
  "DROY",
  // All-Pro legacy (kept for BC)
  "ALL_PRO_1ST",
  "ALL_PRO_2ND",
  // Weekly – Player of the Week
  "AFC_OPOW",
  "NFC_OPOW",
  "AFC_DPOW",
  "NFC_DPOW",
  // All-Pro positional slots
  "AP_QB",
  "AP_RB",
  "AP_WR1",
  "AP_WR2",
  "AP_TE",
  "AP_FLEX",
  "AP_LT",
  "AP_LG",
  "AP_C",
  "AP_RG",
  "AP_RT",
  "AP_EDGE1",
  "AP_EDGE2",
  "AP_DT1",
  "AP_DT2",
  "AP_SAM",
  "AP_MIKE",
  "AP_WILL",
  "AP_CB1",
  "AP_CB2",
  "AP_S1",
  "AP_S2",
] as const;

export type AwardType = typeof AWARD_TYPES[number];

export const playerAwardsTable = pgTable("player_awards", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  leagueId: integer("league_id").notNull(),
  season: integer("season").notNull(),
  week: integer("week"),
  isOverride: boolean("is_override").notNull().default(false),
  awardType: text("award_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlayerAwardSchema = createInsertSchema(playerAwardsTable).omit({ id: true, createdAt: true });
export type InsertPlayerAward = z.infer<typeof insertPlayerAwardSchema>;
export type PlayerAward = typeof playerAwardsTable.$inferSelect;
