import json
import os
import random
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://192.168.45.78:5173",
        "http://192.168.45.78:5174",
        "http://192.168.45.78:5175",
    ],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

DB_PATH = Path(__file__).with_name("festival.sqlite3")
ADMIN_PASSWORD = os.getenv("FESTIVAL_ADMIN_PASSWORD", "festival-admin")

WIN_RATE = 0.40
MULTIPLIERS = [3, 5, 7, 10]
SNAIL_NAMES = ["핑쿠루", "아쿠아", "골져스", "그린이", "퍼푸리", "오란줴줴이", "레드썬", "민트초코", "흰둥이", "스카이"]
WIN_PROBABILITY_BY_MULTIPLIER = {
    3: 0.30,
    5: 0.18,
    7: 0.1285,
    10: 0.08,
}

g_win_rate: float = WIN_RATE
g_win_prob: dict[int, float] = WIN_PROBABILITY_BY_MULTIPLIER.copy()


def build_snail_timeline(snail_count: int, winner: int):
    positions = [0.0 for _ in range(snail_count)]
    frames = []
    finish_order = []
    tick_ms = 80
    max_frames = 190

    for _ in range(max_frames):
        for i in range(snail_count):
            if i in finish_order:
                continue

            if positions[i] < 80:
                speed = 0.25 + random.random() * 1.15
            elif i == winner:
                speed = 0.9 + random.random() * 1.2
            else:
                speed = 0.15 + random.random() * 0.7

            positions[i] = min(positions[i] + speed, 100)
            if i != winner and positions[i] >= 98:
                positions[i] = 98

            if positions[i] >= 100 and i not in finish_order:
                finish_order.append(i)

        frames.append({
            "positions": [round(pos, 2) for pos in positions],
            "finish_order": finish_order[:],
        })

        if positions[winner] >= 100:
            break

    for _ in range(8):
        for i in range(snail_count):
            if i != winner and positions[i] < 99:
                positions[i] = min(positions[i] + random.random() * 2, 99)
        frames.append({
            "positions": [round(pos, 2) for pos in positions],
            "finish_order": finish_order[:],
        })

    return {
        "tick_ms": tick_ms,
        "frames": frames,
    }


def now_text():
    return datetime.now().isoformat(timespec="seconds")


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS game_sessions (
                id TEXT PRIMARY KEY,
                game_type TEXT NOT NULL,
                data_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS game_results (
                id TEXT PRIMARY KEY,
                game_type TEXT NOT NULL,
                game_name TEXT NOT NULL,
                result_text TEXT NOT NULL,
                user_choice TEXT,
                is_win INTEGER,
                details_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_results_game_type_created ON game_results(game_type, created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_status_created ON game_sessions(status, created_at)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value REAL NOT NULL
            )
            """
        )


def load_settings_from_db():
    global g_win_rate, g_win_prob
    with connect() as conn:
        rows = conn.execute("SELECT key, value FROM app_settings").fetchall()
    for row in rows:
        key, value = row["key"], float(row["value"])
        if key == "oddeven_win_rate":
            g_win_rate = value
        elif key.startswith("snail_win_rate_"):
            m = int(key.split("_")[-1])
            if m in g_win_prob:
                g_win_prob[m] = value


@app.on_event("startup")
def on_startup():
    init_db()
    load_settings_from_db()


def require_admin(x_admin_key: str | None):
    if x_admin_key != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")


def create_session(game_type: str, data: dict) -> str:
    game_id = uuid4().hex
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO game_sessions (id, game_type, data_json, status, created_at)
            VALUES (?, ?, ?, 'active', ?)
            """,
            (game_id, game_type, json.dumps(data, ensure_ascii=False), now_text()),
        )
    return game_id


def pop_session(game_id: str, game_type: str) -> dict:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT * FROM game_sessions
            WHERE id = ? AND game_type = ? AND status = 'active'
            """,
            (game_id, game_type),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=400, detail="Invalid or expired game_id")

        conn.execute(
            "UPDATE game_sessions SET status = 'used' WHERE id = ?",
            (game_id,),
        )
    return json.loads(row["data_json"])


def save_result(game_type: str, game_name: str, result_text: str, user_choice: str | None, is_win: bool | None, details: dict):
    result_id = uuid4().hex
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO game_results (
                id, game_type, game_name, result_text, user_choice, is_win, details_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result_id,
                game_type,
                game_name,
                result_text,
                user_choice,
                None if is_win is None else int(is_win),
                json.dumps(details, ensure_ascii=False),
                now_text(),
            ),
        )
    return result_id


def result_row_to_dict(row):
    return {
        "id": row["id"],
        "gameType": row["game_type"],
        "gameName": row["game_name"],
        "resultText": row["result_text"],
        "userChoice": row["user_choice"],
        "isWin": None if row["is_win"] is None else bool(row["is_win"]),
        "details": json.loads(row["details_json"]) if row["details_json"] else {},
        "createdAt": row["created_at"],
    }


@app.get("/oddeven/first")
def get_first_card():
    first_card = random.randint(1, 10)
    game_id = create_session("odd-even", {"first_card": first_card})
    return {"game_id": game_id, "card": first_card}


class SecondCardRequest(BaseModel):
    game_id: str
    guess: Literal["odd", "even"]


@app.post("/oddeven/second")
def get_second_card(body: SecondCardRequest):
    game = pop_session(body.game_id, "odd-even")
    first = game["first_card"]
    first_is_odd = first % 2 == 1
    should_win = random.random() < g_win_rate

    guess_wants_odd_sum = body.guess == "odd"
    sum_should_be_odd = guess_wants_odd_sum if should_win else not guess_wants_odd_sum
    second_should_be_odd = first_is_odd ^ sum_should_be_odd

    candidates = [
        c for c in range(1, 11)
        if c != first and (c % 2 == 1) == second_should_be_odd
    ]
    second = random.choice(candidates)

    total = first + second
    result = "odd" if total % 2 == 1 else "even"
    win = result == body.guess
    save_result(
        game_type="odd-even",
        game_name="홀짝게임",
        result_text="홀" if result == "odd" else "짝",
        user_choice="홀" if body.guess == "odd" else "짝",
        is_win=win,
        details={
            "first_card": first,
            "second_card": second,
            "total": total,
            "result": result,
            "guess": body.guess,
        },
    )

    return {"card": second, "total": total, "result": result, "win": win}


@app.get("/snail/spin")
def spin_roulette():
    multiplier = random.choice(MULTIPLIERS)
    game_id = create_session("snail", {"multiplier": multiplier})
    return {"game_id": game_id, "multiplier": multiplier}


class RaceRequest(BaseModel):
    game_id: str
    chosen: int = Field(..., ge=0)


@app.post("/snail/race")
def race(body: RaceRequest):
    game = pop_session(body.game_id, "snail")
    snail_count = game["multiplier"]
    chosen = body.chosen

    if chosen >= snail_count:
        raise HTTPException(status_code=400, detail="Invalid chosen index")

    win_probability = g_win_prob[snail_count]
    win = random.random() < win_probability

    if win:
        winner = chosen
    else:
        candidates = [i for i in range(snail_count) if i != chosen]
        winner = random.choice(candidates)

    timeline = build_snail_timeline(snail_count, winner)
    winner_name = SNAIL_NAMES[winner]
    save_result(
        game_type="snail",
        game_name="달팽이게임",
        result_text=f"{winner_name} 우승",
        user_choice=SNAIL_NAMES[chosen],
        is_win=win,
        details={
            "snail_count": snail_count,
            "chosen": chosen,
            "winner": winner,
            "win_probability": win_probability,
        },
    )

    return {"winner": winner, "win": win, "timeline": timeline}


@app.get("/results")
def list_results(
    game_type: str | None = Query(default=None),
    limit: int = Query(default=15, ge=1, le=10000),
):
    params = []
    where = ""
    if game_type:
        where = "WHERE game_type = ?"
        params.append(game_type)

    with connect() as conn:
        rows = conn.execute(
            f"""
            SELECT * FROM game_results
            {where}
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (*params, limit),
        ).fetchall()
    return {"results": [result_row_to_dict(row) for row in rows]}


@app.post("/admin/login")
def admin_login(x_admin_key: str | None = Header(default=None)):
    require_admin(x_admin_key)
    return {"ok": True}


@app.get("/admin/summary")
def admin_summary(x_admin_key: str | None = Header(default=None)):
    require_admin(x_admin_key)
    with connect() as conn:
        total = conn.execute("SELECT COUNT(*) AS count FROM game_results").fetchone()["count"]
        by_game = conn.execute(
            """
            SELECT game_type, COUNT(*) AS plays, SUM(CASE WHEN is_win = 1 THEN 1 ELSE 0 END) AS wins
            FROM game_results
            GROUP BY game_type
            ORDER BY game_type
            """
        ).fetchall()
        recent = conn.execute(
            "SELECT * FROM game_results ORDER BY created_at DESC LIMIT 20"
        ).fetchall()

    return {
        "totalPlays": total,
        "byGame": [
            {
                "gameType": row["game_type"],
                "plays": row["plays"],
                "wins": row["wins"] or 0,
                "winRate": 0 if row["plays"] == 0 else round(((row["wins"] or 0) / row["plays"]) * 100, 1),
            }
            for row in by_game
        ],
        "recentResults": [result_row_to_dict(row) for row in recent],
    }


@app.get("/admin/settings")
def get_settings(x_admin_key: str | None = Header(default=None)):
    require_admin(x_admin_key)
    return {
        "oddeven_win_rate": g_win_rate,
        "snail_win_rate_3": g_win_prob[3],
        "snail_win_rate_5": g_win_prob[5],
        "snail_win_rate_7": g_win_prob[7],
        "snail_win_rate_10": g_win_prob[10],
    }


class SettingsBody(BaseModel):
    oddeven_win_rate: float = Field(..., ge=0.0, le=1.0)
    snail_win_rate_3: float = Field(..., ge=0.0, le=1.0)
    snail_win_rate_5: float = Field(..., ge=0.0, le=1.0)
    snail_win_rate_7: float = Field(..., ge=0.0, le=1.0)
    snail_win_rate_10: float = Field(..., ge=0.0, le=1.0)


@app.post("/admin/settings")
def update_settings(body: SettingsBody, x_admin_key: str | None = Header(default=None)):
    global g_win_rate, g_win_prob
    require_admin(x_admin_key)
    g_win_rate = body.oddeven_win_rate
    g_win_prob[3] = body.snail_win_rate_3
    g_win_prob[5] = body.snail_win_rate_5
    g_win_prob[7] = body.snail_win_rate_7
    g_win_prob[10] = body.snail_win_rate_10
    pairs = [
        ("oddeven_win_rate", g_win_rate),
        ("snail_win_rate_3", g_win_prob[3]),
        ("snail_win_rate_5", g_win_prob[5]),
        ("snail_win_rate_7", g_win_prob[7]),
        ("snail_win_rate_10", g_win_prob[10]),
    ]
    with connect() as conn:
        for key, val in pairs:
            conn.execute(
                "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
                (key, val),
            )
    return {"ok": True}


@app.delete("/admin/results")
def clear_results(
    game_type: str | None = Query(default=None),
    x_admin_key: str | None = Header(default=None),
):
    require_admin(x_admin_key)
    with connect() as conn:
        if game_type:
            conn.execute("DELETE FROM game_results WHERE game_type = ?", (game_type,))
        else:
            conn.execute("DELETE FROM game_results")
    return {"ok": True}


_dist_dir = Path(__file__).parent / "dist"
if _dist_dir.exists():
    app.mount("/", StaticFiles(directory=_dist_dir, html=True), name="static")
