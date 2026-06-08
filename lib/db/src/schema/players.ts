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
  speed: integer("speed").notNull().default(75),
  strength: integer("strength").notNull().default(70),
  awareness: integer("awareness").notNull().default(72),
  throwingPower: integer("throwing_power"),
  catching: integer("catching"),
  tackling: integer("tackling"),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
