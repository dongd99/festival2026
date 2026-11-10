import type { Config } from "@netlify/functions";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { appSettings, gameResults, gameSessions } from "../../db/schema.js";

const MULTIPLIERS = [3, 5, 7, 10] as const;
const SNAIL_NAMES = ["핑쿠루", "아쿠아", "골져스", "그린이", "퍼푸리", "오란줴줴이", "레드썬", "민트초코", "흰둥이", "스카이"];

const DEFAULT_SETTINGS: Record<string, number> = {
  oddeven_win_rate: 0.4,
  snail_win_rate_3: 0.3,
  snail_win_rate_5: 0.18,
  snail_win_rate_7: 0.1285,
  snail_win_rate_10: 0.08,
};
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const choice = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;

// Same "YYYY-MM-DDTHH:mm:ss" shape the original backend produced, in Korea time.
const formatTime = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(" ", "T");

function buildSnailTimeline(snailCount: number, winner: number) {
  const positions = Array.from({ length: snailCount }, () => 0);
  const frames: { positions: number[]; finish_order: number[] }[] = [];
  const finishOrder: number[] = [];

  for (let f = 0; f < 190; f++) {
    for (let i = 0; i < snailCount; i++) {
      if (finishOrder.includes(i)) continue;
      let speed: number;
      if (positions[i] < 80) speed = 0.25 + Math.random() * 1.15;
      else if (i === winner) speed = 0.9 + Math.random() * 1.2;
      else speed = 0.15 + Math.random() * 0.7;

      positions[i] = Math.min(positions[i] + speed, 100);
      if (i !== winner && positions[i] >= 98) positions[i] = 98;
      if (positions[i] >= 100 && !finishOrder.includes(i)) finishOrder.push(i);
    }
    frames.push({ positions: positions.map(round2), finish_order: [...finishOrder] });
    if (positions[winner] >= 100) break;
  }

  for (let f = 0; f < 8; f++) {
    for (let i = 0; i < snailCount; i++) {
      if (i !== winner && positions[i] < 99) positions[i] = Math.min(positions[i] + Math.random() * 2, 99);
    }
    frames.push({ positions: positions.map(round2), finish_order: [...finishOrder] });
  }

  return { tick_ms: 80, frames };
}

async function loadSettings() {
  const rows = await db.select().from(appSettings);
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in settings) settings[row.key] = Number(row.value);
  }
  return settings;
}

async function createSession(gameType: string, data: Record<string, unknown>) {
  const id = crypto.randomUUID().replace(/-/g, "");
  await db.insert(gameSessions).values({ id, gameType, data });
  return id;
}

// Atomically marks the session as used so a round can't be played twice.
async function popSession(id: unknown, gameType: string) {
  if (typeof id !== "string" || !id) throw new HttpError(400, "Invalid or expired game_id");
  const [row] = await db
    .update(gameSessions)
    .set({ status: "used" })
    .where(and(eq(gameSessions.id, id), eq(gameSessions.gameType, gameType), eq(gameSessions.status, "active")))
    .returning();
  if (!row) throw new HttpError(400, "Invalid or expired game_id");
  return row.data as Record<string, number>;
}

async function saveResult(r: {
  gameType: string;
  gameName: string;
  resultText: string;
  userChoice: string | null;
  isWin: boolean | null;
  details: Record<string, unknown>;
}) {
  await db.insert(gameResults).values({ id: crypto.randomUUID().replace(/-/g, ""), ...r });
}

function resultToJson(row: typeof gameResults.$inferSelect) {
  return {
    id: row.id,
    gameType: row.gameType,
    gameName: row.gameName,
    resultText: row.resultText,
    userChoice: row.userChoice,
    isWin: row.isWin,
    details: row.details ?? {},
    createdAt: formatTime(row.createdAt),
  };
}

function requireAdmin(req: Request) {
  const password = Netlify.env.get("FESTIVAL_ADMIN_PASSWORD") || "festival-admin";
  if (req.headers.get("x-admin-key") !== password) throw new HttpError(401, "Invalid admin password");
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError(422, "Invalid JSON body");
}

async function route(req: Request): Promise<unknown> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
  const key = `${req.method} ${path}`;

  switch (key) {
    case "GET /oddeven/first": {
      const card = randInt(1, 10);
      const game_id = await createSession("odd-even", { first_card: card });
      return { game_id, card };
    }

    case "POST /oddeven/second": {
      const body = await readJson(req);
      if (body.guess !== "odd" && body.guess !== "even") throw new HttpError(422, "guess must be 'odd' or 'even'");
      const guess = body.guess;
      const { first_card: first } = await popSession(body.game_id, "odd-even");
      const settings = await loadSettings();

      const shouldWin = Math.random() < settings.oddeven_win_rate;
      const wantsOdd = guess === "odd";
      const sumShouldBeOdd = shouldWin ? wantsOdd : !wantsOdd;
      const secondShouldBeOdd = (first % 2 === 1) !== sumShouldBeOdd;
      const candidates = Array.from({ length: 10 }, (_, i) => i + 1).filter(
        (c) => c !== first && (c % 2 === 1) === secondShouldBeOdd,
      );
      const second = choice(candidates);
      const total = first + second;
      const result = total % 2 === 1 ? "odd" : "even";
      const win = result === guess;

      await saveResult({
        gameType: "odd-even",
        gameName: "홀짝게임",
        resultText: result === "odd" ? "홀" : "짝",
        userChoice: guess === "odd" ? "홀" : "짝",
        isWin: win,
        details: { first_card: first, second_card: second, total, result, guess },
      });
      return { card: second, total, result, win };
    }

    case "GET /snail/spin": {
      const multiplier = choice(MULTIPLIERS);
      const game_id = await createSession("snail", { multiplier });
      return { game_id, multiplier };
    }

    case "POST /snail/race": {
      const body = await readJson(req);
      const chosen = body.chosen;
      if (typeof chosen !== "number" || !Number.isInteger(chosen) || chosen < 0) {
        throw new HttpError(422, "chosen must be a non-negative integer");
      }
      const { multiplier: snailCount } = await popSession(body.game_id, "snail");
      if (chosen >= snailCount) throw new HttpError(400, "Invalid chosen index");

      const settings = await loadSettings();
      const winProbability = settings[`snail_win_rate_${snailCount}`];
      const win = Math.random() < winProbability;
      const winner = win ? chosen : choice(Array.from({ length: snailCount }, (_, i) => i).filter((i) => i !== chosen));
      const timeline = buildSnailTimeline(snailCount, winner);

      await saveResult({
        gameType: "snail",
        gameName: "달팽이게임",
        resultText: `${SNAIL_NAMES[winner]} 우승`,
        userChoice: SNAIL_NAMES[chosen],
        isWin: win,
        details: { snail_count: snailCount, chosen, winner, win_probability: winProbability },
      });
      return { winner, win, timeline };
    }

    case "GET /results": {
      const gameType = url.searchParams.get("game_type");
      const limit = Number(url.searchParams.get("limit") ?? 15);
      if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new HttpError(422, "Invalid limit");
      const rows = await db
        .select()
        .from(gameResults)
        .where(gameType ? eq(gameResults.gameType, gameType) : undefined)
        .orderBy(desc(gameResults.createdAt))
        .limit(limit);
      return { results: rows.map(resultToJson) };
    }

    case "POST /admin/login":
      requireAdmin(req);
      return { ok: true };

    case "GET /admin/summary": {
      requireAdmin(req);
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(gameResults);
      const byGame = await db
        .select({
          gameType: gameResults.gameType,
          plays: sql<number>`count(*)::int`,
          wins: sql<number>`count(*) filter (where ${gameResults.isWin})::int`,
        })
        .from(gameResults)
        .groupBy(gameResults.gameType)
        .orderBy(gameResults.gameType);
      const recent = await db.select().from(gameResults).orderBy(desc(gameResults.createdAt)).limit(20);
      return {
        totalPlays: count,
        byGame: byGame.map((g) => ({
          ...g,
          winRate: g.plays === 0 ? 0 : Math.round((g.wins / g.plays) * 1000) / 10,
        })),
        recentResults: recent.map(resultToJson),
      };
    }

    case "GET /admin/settings":
      requireAdmin(req);
      return await loadSettings();

    case "POST /admin/settings": {
      requireAdmin(req);
      const body = await readJson(req);
      const values = SETTING_KEYS.map((k) => {
        const v = body[k];
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
          throw new HttpError(422, `${k} must be a number between 0 and 1`);
        }
        return { key: k, value: v };
      });
      await db
        .insert(appSettings)
        .values(values)
        .onConflictDoUpdate({ target: appSettings.key, set: { value: sql`excluded.value` } });
      return { ok: true };
    }

    case "DELETE /admin/results": {
      requireAdmin(req);
      const gameType = url.searchParams.get("game_type");
      await db.delete(gameResults).where(gameType ? eq(gameResults.gameType, gameType) : undefined);
      return { ok: true };
    }
  }

  throw new HttpError(404, "Not found");
}

export default async (req: Request) => {
  try {
    return Response.json(await route(req));
  } catch (err) {
    if (err instanceof HttpError) return Response.json({ detail: err.message }, { status: err.status });
    console.error(err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/*",
};
