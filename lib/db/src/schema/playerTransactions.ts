import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const TRANSACTION_TYPES = [
  "DRAFTED",
  "SIGNED",
  "RELEASED",
  "TRADED",
  "WAIVER",
  "PRACTICE_SQUAD",
  "RETIRED",
  "RESTRUCTURED",
] as const;

export type TransactionType = typeof TRANSACTION_TYPES[number];

export const playerTransactionsTable = pgTable("player_transactions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  leagueId: integer("league_id").notNull(),
  season: integer("season").notNull(),
  week: integer("week"),
  transactionType: text("transaction_type").notNull(),
  fromTeam: text("from_team"),
  toTeam: text("to_team"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlayerTransaction = typeof playerTransactionsTable.$inferSelect;
export type InsertPlayerTransaction = typeof playerTransactionsTable.$inferInsert;
