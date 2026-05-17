import psycopg2
from psycopg2.extras import RealDictCursor

from core.config import settings


def get_conn():
    return psycopg2.connect(settings.import_database_url)


def add_favorite(user_id: int, movie_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Kiểm tra movie có tồn tại không
            cur.execute(
                """
                SELECT id
                FROM movies
                WHERE id = %s
                """,
                (movie_id,)
            )

            movie = cur.fetchone()

            if not movie:
                return None

            # Insert favorite, nếu đã có thì bỏ qua
            cur.execute(
                """
                INSERT INTO favorites (user_id, movie_id)
                VALUES (%s, %s)
                ON CONFLICT (user_id, movie_id) DO NOTHING
                """,
                (user_id, movie_id)
            )

            # Lấy lại thông tin favorite + movie
            cur.execute(
                """
                SELECT
                    f.id,
                    f.user_id,
                    f.movie_id,
                    f.created_at,
                    m.title,
                    m.genres_text AS genres,
                    m.poster_url,
                    m.release_year
                FROM favorites f
                JOIN movies m ON m.id = f.movie_id
                WHERE f.user_id = %s
                  AND f.movie_id = %s
                """,
                (user_id, movie_id)
            )

            return dict(cur.fetchone())


def get_user_favorites(user_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    f.id,
                    f.user_id,
                    f.movie_id,
                    f.created_at,
                    m.title,
                    m.genres_text AS genres,
                    m.poster_url,
                    m.release_year
                FROM favorites f
                JOIN movies m ON m.id = f.movie_id
                WHERE f.user_id = %s
                ORDER BY f.created_at DESC
                """,
                (user_id,)
            )

            return list(cur.fetchall())


def remove_favorite(user_id: int, movie_id: int):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                DELETE FROM favorites
                WHERE user_id = %s
                  AND movie_id = %s
                RETURNING id, user_id, movie_id
                """,
                (user_id, movie_id)
            )

            deleted = cur.fetchone()

            if not deleted:
                return None

            return dict(deleted)


def is_favorite(user_id: int, movie_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1
                FROM favorites
                WHERE user_id = %s
                  AND movie_id = %s
                """,
                (user_id, movie_id)
            )

            return cur.fetchone() is not None