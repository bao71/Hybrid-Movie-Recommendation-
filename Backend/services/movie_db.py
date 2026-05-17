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

    # Nếu lỡ dùng DATABASE_URL dạng asyncpg thì đổi về psycopg2
    url = url.replace("postgresql+asyncpg://", "postgresql://")

    return url


def get_conn():
    return psycopg2.connect(get_database_url())


def fetch_movies(limit=20, offset=0, genre=None):
    limit = max(1, min(int(limit), 100))
    offset = max(0, int(offset))

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if genre:
                cur.execute(
                    """
                    SELECT
                        id AS movie_id,
                        title,
                        genres_text AS genres,
                        poster_url,
                        release_year
                    FROM movies
                    WHERE genres_text ILIKE %s
                    ORDER BY
                        CASE
                            WHEN poster_url IS NOT NULL AND poster_url <> '' THEN 0
                            ELSE 1
                        END,
                        id
                    LIMIT %s OFFSET %s
                    """,
                    (f"%{genre}%", limit, offset)
                )
            else:
                cur.execute(
                    """
                    SELECT
                        id AS movie_id,
                        title,
                        genres_text AS genres,
                        poster_url,
                        release_year
                    FROM movies
                    ORDER BY
                        CASE
                            WHEN poster_url IS NOT NULL AND poster_url <> '' THEN 0
                            ELSE 1
                        END,
                        id
                    LIMIT %s OFFSET %s
                    """,
                    (limit, offset)
                )

            return list(cur.fetchall())


def search_movies(q, limit=20):
    limit = max(1, min(int(limit), 100))

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id AS movie_id,
                    title,
                    genres_text AS genres,
                    poster_url,
                    release_year
                FROM movies
                WHERE title ILIKE %s
                   OR genres_text ILIKE %s
                ORDER BY
                    CASE
                        WHEN poster_url IS NOT NULL AND poster_url <> '' THEN 0
                        ELSE 1
                    END,
                    title
                LIMIT %s
                """,
                (f"%{q}%", f"%{q}%", limit)
            )

            return list(cur.fetchall())


def fetch_movie_by_id(movie_id):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id AS movie_id,
                    title,
                    genres_text AS genres,
                    poster_url,
                    release_year
                FROM movies
                WHERE id = %s
                """,
                (movie_id,)
            )

            return cur.fetchone()


def fetch_movie_map(movie_ids):
    if not movie_ids:
        return {}

    movie_ids = [int(x) for x in movie_ids]

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    id AS movie_id,
                    title,
                    genres_text AS genres,
                    poster_url,
                    release_year
                FROM movies
                WHERE id = ANY(%s)
                """,
                (movie_ids,)
            )

            rows = cur.fetchall()

    return {
        int(row["movie_id"]): dict(row)
        for row in rows
    }


def enrich_items_with_db(items):
    movie_ids = []

    for item in items:
        movie_id = item.get("movie_id") or item.get("MovieId")
        if movie_id is not None:
            movie_ids.append(int(movie_id))

    movie_map = fetch_movie_map(movie_ids)

    enriched = []

    for item in items:
        item = dict(item)

        movie_id = item.get("movie_id") or item.get("MovieId")
        if movie_id is None:
            enriched.append(item)
            continue

        movie_id = int(movie_id)
        db_movie = movie_map.get(movie_id, {})

        item["movie_id"] = movie_id
        item["title"] = item.get("title") or item.get("Title") or db_movie.get("title", "")
        item["genres"] = item.get("genres") or item.get("Genres") or db_movie.get("genres", "")
        item["poster_url"] = db_movie.get("poster_url") or item.get("poster_url", "")
        item["release_year"] = db_movie.get("release_year")

        enriched.append(item)

    return enriched