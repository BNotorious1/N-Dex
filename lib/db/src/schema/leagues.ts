import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leaguesTable = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  commissionerName: text("commissioner_name").notNull(),
  platform: text("platform").notNull().default("PS5"),
  difficulty: text("difficulty").notNull().default("ALL_MADDEN"),
  category: text("category").notNull().default("REGULAR"),
  skillLevel: text("skill_level").notNull().default("INTERMEDIATE"),
  advanceTimeHours: integer("advance_time_hours").notNull().default(48),
  week: integer("week").notNull().default(1),
  season: integer("season").notNull().default(2025),
  phase: text("phase").notNull().default("PRE_SEASON"),
  memberCount: integer("member_count").notNull().default(1),
  maxMembers: integer("max_members").notNull().default(32),
  isCrossPlay: boolean("is_cross_play").notNull().default(false),
  isMoneyLeague: boolean("is_money_league").notNull().default(false),
  description: text("description"),
  customId: text("custom_id").unique(),
  eaLeagueId: text("ea_league_id"),
  // EA Connect
  isEaConnected: boolean("is_ea_connected").notNull().default(false),
  exportInfo: jsonb("export_info").$type<Record<string, unknown>>(),
  eaAccessToken: text("ea_access_token"),
  eaRefreshToken: text("ea_refresh_token"),
  eaTokenExpiry: integer("ea_token_expiry"),
  eaConsole: text("ea_console"),
  eaBlazeId: text("ea_blaze_id"),
  eaSelectedLeague: text("ea_selected_league"),
  eaBlazeSessionKey: text("ea_blaze_session_key"),
  eaBlazeSessionExpiry: integer("ea_blaze_session_expiry"),
  joinToken: text("join_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeagueSchema = createInsertSchema(leaguesTable).omit({ id: true, createdAt: true });
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leaguesTable.$inferSelect;
