import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const AWARD_TYPES = [
  "MVP",
  "AFC_OPOY",
  "NFC_OPOY",
  "DPOY",
  "DROY",
  "OROY",
  "ALL_PRO_1ST",
  "ALL_PRO_2ND",
] as const;

export type AwardType = typeof AWARD_TYPES[number];

export const playerAwardsTable = pgTable("player_awards", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  leagueId: integer("league_id").notNull(),
  season: integer("season").notNull(),
  awardType: text("award_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlayerAwardSchema = createInsertSchema(playerAwardsTable).omit({ id: true, createdAt: true });
export type InsertPlayerAward = z.infer<typeof insertPlayerAwardSchema>;
export type PlayerAward = typeof playerAwardsTable.$inferSelect;
