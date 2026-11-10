import { pgTable, text, boolean, jsonb, timestamp, doublePrecision, index } from "drizzle-orm/pg-core";

// One-time game rounds: created on the first step, consumed on the second.
export const gameSessions = pgTable(
  "game_sessions",
  {
    id: text().primaryKey(),
    gameType: text("game_type").notNull(),
    data: jsonb().notNull(),
    status: text().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_sessions_status_created").on(t.status, t.createdAt)],
);

export const gameResults = pgTable(
  "game_results",
  {
    id: text().primaryKey(),
    gameType: text("game_type").notNull(),
    gameName: text("game_name").notNull(),
    resultText: text("result_text").notNull(),
    userChoice: text("user_choice"),
    isWin: boolean("is_win"),
    details: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_results_game_type_created").on(t.gameType, t.createdAt)],
);

export const appSettings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: doublePrecision().notNull(),
});
