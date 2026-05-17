import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv


load_dotenv(".env", override=True)


def get_database_url():
    url = os.getenv(
        "IMPORT_DATABASE_URL",
        "postgresql://movie_user:movie_pass@127.0.0.1:5433/movie_recommender"
    )

    url = url.replace("postgresql+asyncpg://", "postgresql://")
    return url


def get_conn():
    return psycopg2.connect(get_database_url())


def register_user(username: str | None, email: str, password: str):
    email = email.strip().lower()

    if not username:
        username = email.split("@")[0]

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id
                FROM users
                WHERE email = %s
                """,
                (email,)
            )

            existed_user = cur.fetchone()

            if existed_user:
                return None

            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, is_guest)
                VALUES (%s, %s, %s, %s)
                RETURNING id, username, email, is_guest, created_at
                """,
                (
                    username,
                    email,
                    password,
                    False
                )
            )

            return dict(cur.fetchone())


def login_user(email: str, password: str):
    email = email.strip().lower()

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, username, email, is_guest, created_at
                FROM users
                WHERE email = %s
                  AND password_hash = %s
                """,
                (
                    email,
                    password
                )
            )

            user = cur.fetchone()

            if not user:
                return None

            return dict(user)


def get_user_by_id(user_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, username, email, is_guest, created_at
                FROM users
                WHERE id = %s
                """,
                (user_id,)
            )

            user = cur.fetchone()

            if not user:
                return None

            return dict(user)