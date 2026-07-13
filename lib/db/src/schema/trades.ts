import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";
import { playersTable } from "./players";

export const TRADE_STATUSES = ["PENDING", "APPROVED", "DENIED", "CANCELLED"] as const;
export type TradeStatus = typeof TRADE_STATUSES[number];

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  season: integer("season").notNull(),
  week: integer("week"),
  status: text("status").notNull().default("PENDING"),
  teamAId: integer("team_a_id").notNull().references(() => teamsTable.id),
  teamBId: integer("team_b_id").notNull().references(() => teamsTable.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tradePlayersTable = pgTable("trade_players", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => tradesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  fromTeamId: integer("from_team_id").notNull().references(() => teamsTable.id),
});

export type Trade = typeof tradesTable.$inferSelect;
export type InsertTrade = typeof tradesTable.$inferInsert;
export type TradePlayers = typeof tradePlayersTable.$inferSelect;
