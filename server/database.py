"""SQLite database layer for FUD Buddy (replaces mocked Airtable)."""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "fudbuddy.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            client_id TEXT,
            preferences TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL REFERENCES sessions(id),
            index_num INTEGER NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL REFERENCES sessions(id),
            rating INTEGER,
            went INTEGER,
            comment TEXT,
            contact TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(session_id)
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            table_name TEXT,
            data TEXT,
            client_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(client_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
        CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
    """)
    conn.close()


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def create_session(session_id: str, client_id: str, preferences: dict) -> None:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO sessions (id, client_id, preferences) VALUES (?, ?, ?)",
            (session_id, client_id, json.dumps(preferences)),
        )
        conn.commit()
    finally:
        conn.close()


def save_recommendations(session_id: str, recommendations: list[dict]) -> None:
    conn = get_db()
    try:
        for i, rec in enumerate(recommendations):
            conn.execute(
                "INSERT INTO recommendations (session_id, index_num, data) VALUES (?, ?, ?)",
                (session_id, i, json.dumps(rec)),
            )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Feedback helpers
# ---------------------------------------------------------------------------

def upsert_feedback(session_id: str, rating: int | None = None,
                    went: bool | None = None, comment: str | None = None,
                    contact: str | None = None) -> None:
    conn = get_db()
    try:
        # Ensure session exists (create a stub if client sent feedback for an unknown session)
        sess = conn.execute("SELECT id FROM sessions WHERE id = ?", (session_id,)).fetchone()
        if not sess:
            conn.execute(
                "INSERT INTO sessions (id, client_id, preferences) VALUES (?, ?, ?)",
                (session_id, "unknown", "{}"),
            )

        existing = conn.execute(
            "SELECT id FROM feedback WHERE session_id = ?", (session_id,)
        ).fetchone()

        if existing:
            parts, params = [], []
            if rating is not None:
                parts.append("rating = ?")
                params.append(rating)
            if went is not None:
                parts.append("went = ?")
                params.append(int(went))
            if comment is not None:
                parts.append("comment = ?")
                params.append(comment)
            if contact is not None:
                parts.append("contact = ?")
                params.append(contact)
            if parts:
                params.append(session_id)
                conn.execute(
                    f"UPDATE feedback SET {', '.join(parts)} WHERE session_id = ?",
                    params,
                )
        else:
            conn.execute(
                "INSERT INTO feedback (session_id, rating, went, comment, contact) "
                "VALUES (?, ?, ?, ?, ?)",
                (session_id, rating, int(went) if went is not None else None,
                 comment, contact),
            )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Events / analytics helpers (replaces Airtable mock)
# ---------------------------------------------------------------------------

def log_event(event_type: str, table_name: str | None = None,
              data: dict | None = None, client_id: str | None = None) -> None:
    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO events (event_type, table_name, data, client_id) VALUES (?, ?, ?, ?)",
            (event_type, table_name, json.dumps(data) if data else None, client_id),
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Rate-limit helpers
# ---------------------------------------------------------------------------

def count_sessions_today(client_id: str) -> int:
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM sessions "
            "WHERE client_id = ? AND created_at >= date('now')",
            (client_id,),
        ).fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()
