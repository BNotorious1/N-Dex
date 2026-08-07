import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";

export const leagueInvitesTable = pgTable("league_invites", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  discordName: text("discord_name").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedByDiscordId: text("accepted_by_discord_id"),
  acceptedByDiscordName: text("accepted_by_discord_name"),
});

export type LeagueInvite = typeof leagueInvitesTable.$inferSelect;
