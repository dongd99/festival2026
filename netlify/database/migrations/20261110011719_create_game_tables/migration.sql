CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY,
	"value" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_results" (
	"id" text PRIMARY KEY,
	"game_type" text NOT NULL,
	"game_name" text NOT NULL,
	"result_text" text NOT NULL,
	"user_choice" text,
	"is_win" boolean,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" text PRIMARY KEY,
	"game_type" text NOT NULL,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_results_game_type_created" ON "game_results" ("game_type","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_status_created" ON "game_sessions" ("status","created_at");