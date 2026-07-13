import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";
import { teamsTable } from "./teams";

export const joinRequestsTable = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  discordName: text("discord_name").notNull(),
  discordId: text("discord_id"),
  gamerTag: text("gamer_tag"),
  platform: text("platform"),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type JoinRequest = typeof joinRequestsTable.$inferSelect;
