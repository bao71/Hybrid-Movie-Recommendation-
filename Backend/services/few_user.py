import math
import time

import psycopg2
from psycopg2.extras import RealDictCursor

from core.config import settings


def get_conn():
    return psycopg2.connect(settings.import_database_url)


def split_genres(genres_text: str):
    if not genres_text:
        return []

    return [
        genre.strip()
        for genre in str(genres_text).split("|")
        if genre.strip()
    ]


def save_rating(user_id: int, movie_id: int, rating: float):
    timestamp = int(time.time())

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO ratings (user_id, movie_id, rating, timestamp)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, movie_id) DO UPDATE SET
                    rating = EXCLUDED.rating,
                    timestamp = EXCLUDED.timestamp
                RETURNING id, user_id, movie_id, rating, timestamp, created_at
                """,
                (user_id, movie_id, rating, timestamp)
            )

            return dict(cur.fetchone())

def get_user_rating_count(user_id: int) -> int:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM ratings
                WHERE user_id = %s
                """,
                (user_id,)
            )

            return cur.fetchone()[0]

def get_user_ratings(user_id: int, limit: int = 50):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    r.user_id,
                    r.movie_id,
                    r.rating,
                    r.timestamp,
                    m.title,
                    m.genres_text AS genres,
                    m.poster_url,
                    m.release_year
                FROM ratings r
                JOIN movies m ON m.id = r.movie_id
                WHERE r.user_id = %s
                ORDER BY r.timestamp DESC
                LIMIT %s
                """,
                (user_id, limit)
            )

            return list(cur.fetchall())


def get_user_preferred_genres(user_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT preferred_genres
                FROM users
                WHERE id = %s
                """,
                (user_id,)
            )

            row = cur.fetchone()

            if not row or not row[0]:
                return []

            return split_genres(row[0])


def recommend_few_rating_user(user_id: int, top_n: int = 10):
    top_n = max(1, min(int(top_n), 50))

    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Lấy toàn bộ rating của user
            cur.execute(
                """
                SELECT
                    r.movie_id,
                    r.rating,
                    m.genres_text AS genres
                FROM ratings r
                JOIN movies m ON m.id = r.movie_id
                WHERE r.user_id = %s
                """,
                (user_id,)
            )

            rated_rows = list(cur.fetchall())

            if not rated_rows:
                return []

            # 2. Chỉ ưu tiên các phim user rating cao
            positive_rows = [
                row for row in rated_rows
                if float(row["rating"]) >= 4.0
            ]

            # Nếu user chưa có rating >= 4, dùng rating >= 3
            if not positive_rows:
                positive_rows = [
                    row for row in rated_rows
                    if float(row["rating"]) >= 3.0
                ]

            # Nếu vẫn không có, dùng toàn bộ rating
            if not positive_rows:
                positive_rows = rated_rows

            # 3. Tính trọng số genre user thích
            genre_weights = {}

            for row in positive_rows:
                rating = float(row["rating"])

                # rating càng cao thì genre của phim đó càng có trọng số lớn
                weight = max(rating - 2.5, 0.5)

                for genre in split_genres(row["genres"]):
                    genre_weights[genre] = genre_weights.get(genre, 0) + weight

            # 4. Cộng thêm genre user chọn lúc đăng ký, nếu có
            preferred_genres = get_user_preferred_genres(user_id)

            for genre in preferred_genres:
                genre_weights[genre] = genre_weights.get(genre, 0) + 1.0

            liked_genres = list(genre_weights.keys())

            if not liked_genres:
                return []

            # 5. Tìm phim chưa được user rating và có genre liên quan
            genre_conditions = " OR ".join(
                ["m.genres_text ILIKE %s" for _ in liked_genres]
            )

            params = [user_id]
            params.extend([f"%{genre}%" for genre in liked_genres])

            query = f"""
                SELECT
                    m.id AS movie_id,
                    m.title,
                    m.genres_text AS genres,
                    m.poster_url,
                    m.release_year,
                    COALESCE(AVG(r.rating), 0) AS avg_rating,
                    COUNT(r.id) AS rating_count
                FROM movies m
                LEFT JOIN ratings r ON r.movie_id = m.id
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM ratings ur
                    WHERE ur.user_id = %s
                      AND ur.movie_id = m.id
                )
                AND ({genre_conditions})
                GROUP BY
                    m.id,
                    m.title,
                    m.genres_text,
                    m.poster_url,
                    m.release_year
                LIMIT 500
            """

            cur.execute(query, params)
            candidates = list(cur.fetchall())

    if not candidates:
        return []

    max_genre_weight = max(genre_weights.values()) if genre_weights else 1.0

    results = []

    for movie in candidates:
        movie_genres = split_genres(movie["genres"])

        # 6. Tính điểm khớp genre
        raw_genre_score = sum(
            genre_weights.get(genre, 0)
            for genre in movie_genres
        )

        genre_score = raw_genre_score / max_genre_weight
        genre_score = min(genre_score, 1.0)

        # 7. Tính điểm chất lượng phim
        avg_rating = float(movie["avg_rating"] or 0)
        rating_count = int(movie["rating_count"] or 0)

        rating_score = avg_rating / 5.0 if avg_rating else 0

        # dùng log để rating_count không áp đảo quá mạnh
        count_score = min(
            math.log1p(rating_count) / math.log1p(1000),
            1.0
        )

        # 8. Final score
        final_score = (
            0.60 * genre_score
            + 0.30 * rating_score
            + 0.10 * count_score
        )

        results.append({
            "movie_id": int(movie["movie_id"]),
            "title": movie["title"],
            "genres": movie["genres"],
            "poster_url": movie["poster_url"] or "",
            "release_year": movie["release_year"],
            "score": round(final_score, 4),
            "reason": "few-rating-hybrid"
        })

    results.sort(key=lambda x: x["score"], reverse=True)

    return results[:top_n]