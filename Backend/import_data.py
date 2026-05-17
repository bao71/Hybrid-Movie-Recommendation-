import os
import re
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

load_dotenv(BASE_DIR / ".env", override=True)
print("[DEBUG] BASE_DIR:", BASE_DIR)
print("[DEBUG] ENV PATH:", BASE_DIR / ".env")
print("[DEBUG] IMPORT_DATABASE_URL:", os.getenv("IMPORT_DATABASE_URL"))
DATABASE_URL = os.getenv(
    "IMPORT_DATABASE_URL",
    "postgresql://movie_user:movie_pass@127.0.0.1:5432/movie_recommender"
)


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def create_tables():
    sql = """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100),
        email VARCHAR(255) UNIQUE,
        password_hash TEXT,
        is_guest BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        release_year INTEGER,
        genres_text TEXT,
        poster_url TEXT,
        description TEXT,
        runtime INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS genres (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movie_genres (
        movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
        genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
        PRIMARY KEY (movie_id, genre_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
        rating FLOAT NOT NULL,
        timestamp BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER REFERENCES movies(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, movie_id)
    );

    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)

    print("[OK] Created tables")


def parse_title_year(raw_title: str):
    """
    Ví dụ:
    Toy Story (1995) -> title=Toy Story, year=1995
    """
    raw_title = str(raw_title).strip()
    match = re.match(r"^(.*)\s+\((\d{4})\)$", raw_title)

    if match:
        title = match.group(1).strip()
        year = int(match.group(2))
        return title, year

    return raw_title, None


def import_movies():
    path = DATA_DIR / "movies.dat"

    if not path.exists():
        print(f"[SKIP] Not found: {path}")
        return

    df = pd.read_csv(
        path,
        sep="::",
        engine="python",
        names=["MovieId", "Title", "Genres"],
        encoding="latin-1"
    )

    movie_rows = []
    genre_names = set()
    movie_genre_pairs_raw = []

    for row in df.itertuples(index=False):
        movie_id = int(row.MovieId)
        title, year = parse_title_year(row.Title)
        genres_text = str(row.Genres)

        movie_rows.append((
            movie_id,
            title,
            year,
            genres_text
        ))

        genres = [g.strip() for g in genres_text.split("|") if g.strip()]
        for genre in genres:
            genre_names.add(genre)
            movie_genre_pairs_raw.append((movie_id, genre))

    with get_conn() as conn:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO movies (id, title, release_year, genres_text)
                VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    release_year = EXCLUDED.release_year,
                    genres_text = EXCLUDED.genres_text
                """,
                movie_rows,
                page_size=5000
            )

            execute_values(
                cur,
                """
                INSERT INTO genres (name)
                VALUES %s
                ON CONFLICT (name) DO NOTHING
                """,
                [(g,) for g in sorted(genre_names)],
                page_size=1000
            )

            cur.execute("SELECT id, name FROM genres")
            genre_map = {name: gid for gid, name in cur.fetchall()}

            movie_genre_pairs = [
                (movie_id, genre_map[genre])
                for movie_id, genre in movie_genre_pairs_raw
                if genre in genre_map
            ]

            execute_values(
                cur,
                """
                INSERT INTO movie_genres (movie_id, genre_id)
                VALUES %s
                ON CONFLICT (movie_id, genre_id) DO NOTHING
                """,
                movie_genre_pairs,
                page_size=5000
            )

    print(f"[OK] Imported movies: {len(movie_rows)}")
    print(f"[OK] Imported genres: {len(genre_names)}")
    print(f"[OK] Imported movie_genres: {len(movie_genre_pairs_raw)}")


def import_posters_from_movies_csv():
    path = DATA_DIR / "movies.csv"

    if not path.exists():
        print(f"[SKIP] Not found: {path}")
        return

    df = pd.read_csv(path)

    rename_map = {
        "MovieID": "movie_id",
        "MovieId": "movie_id",
        "movieId": "movie_id",
        "id": "movie_id",
        "PosterURL": "poster_url",
        "poster": "poster_url",
        "Poster": "poster_url",
    }

    df = df.rename(columns=rename_map)

    if "movie_id" not in df.columns or "poster_url" not in df.columns:
        print("[SKIP] movies.csv must have movie_id and poster_url columns")
        print("[INFO] Columns:", list(df.columns))
        return

    rows = []

    for row in df.itertuples(index=False):
        movie_id = getattr(row, "movie_id")
        poster_url = getattr(row, "poster_url")

        if pd.isna(movie_id):
            continue

        rows.append((
            int(movie_id),
            "" if pd.isna(poster_url) else str(poster_url)
        ))

    with get_conn() as conn:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                UPDATE movies AS m
                SET poster_url = data.poster_url
                FROM (VALUES %s) AS data(movie_id, poster_url)
                WHERE m.id = data.movie_id
                """,
                rows,
                page_size=5000
            )

    print(f"[OK] Updated posters: {len(rows)}")

# from passlib.context import CryptContext

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# def hash_password(password: str) -> str:
#     return pwd_context.hash(password)


def import_users_and_ratings():
    path = DATA_DIR / "ratings.dat"

    if not path.exists():
        print(f"[SKIP] Not found: {path}")
        return

    df = pd.read_csv(
        path,
        sep="::",
        engine="python",
        names=["UserId", "MovieId", "Rating", "Timestamp"],
        encoding="latin-1"
    )

    user_ids = sorted(df["UserId"].dropna().astype(int).unique().tolist())

    user_rows = [
        (
            user_id,
            f"user_{user_id}",
            f"u{user_id}@gmail.com",
            str(user_id),
            False
        )
        for user_id in user_ids
    ]

    

    rating_rows = [
        (
            int(row.UserId),
            int(row.MovieId),
            float(row.Rating),
            int(row.Timestamp)
        )
        for row in df.itertuples(index=False)
    ]

    with get_conn() as conn:
        with conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO users (id, username, email, password_hash, is_guest)
                VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    username = EXCLUDED.username,
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    is_guest = EXCLUDED.is_guest
                """,
                user_rows,
                page_size=5000
            )

            execute_values(
                cur,
                """
                INSERT INTO ratings (user_id, movie_id, rating, timestamp)
                VALUES %s
                ON CONFLICT (user_id, movie_id) DO UPDATE SET
                    rating = EXCLUDED.rating,
                    timestamp = EXCLUDED.timestamp
                """,
                rating_rows,
                page_size=5000
            )

            cur.execute(
                """
                SELECT setval(
                    pg_get_serial_sequence('users', 'id'),
                    COALESCE((SELECT MAX(id) FROM users), 1),
                    true
                )
                """
            )

    print(f"[OK] Imported users: {len(user_rows)}")
    print(f"[OK] Imported ratings: {len(rating_rows)}")
    print("[INFO] Fake login format: email=u<UserId>@gmail.com, password=<UserId>")


def show_counts():
    tables = [
        "users",
        "movies",
        "genres",
        "movie_genres",
        "ratings"
    ]

    with get_conn() as conn:
        with conn.cursor() as cur:
            print("\n===== TABLE COUNTS =====")
            for table in tables:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                print(f"{table}: {count}")
            print("========================\n")


def main():
    

    show_counts()

    print("[DONE] Import completed")


if __name__ == "__main__":
    main()