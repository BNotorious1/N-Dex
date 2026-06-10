import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { leaguesTable } from "./leagues";

export const leagueImportsTable = pgTable("league_imports", {
  id: serial("id").primaryKey(),
  leagueId: integer("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  importType: text("import_type").notNull(),
  status: text("status").notNull().default("success"),
  recordsProcessed: integer("records_processed").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LeagueImport = typeof leagueImportsTable.$inferSelect;
