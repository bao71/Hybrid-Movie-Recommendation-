from fastapi import APIRouter, HTTPException
from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    OldUserRecommendationRequest,
    OldUserRecommendationResponse,
    MovieItem,
    OldUserMovieItem
)
from app.services.recommendation import (
    recommend_new_user_by_genres_scored,
    recommend_old_user_by_model
)
from app.data.loader import load_movies, load_ratings, load_model, load_movies_popular
import csv, os

router = APIRouter()

movies_popular_df = load_movies_popular()
movies_df         = load_movies()
ratings_df        = load_ratings()
model             = load_model()


def _build_poster_map(csv_path: str) -> dict:
    poster_map = {}
    if not os.path.exists(csv_path):
        print(f"[WARNING] movies.csv not found at: {csv_path}")
        return poster_map
    with open(csv_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                mid = int(row["movie_id"])
                poster_map[mid] = row.get("poster_url", "") or ""
            except (ValueError, KeyError):
                pass
    print(f"[INFO] Loaded {len(poster_map)} posters from {csv_path}")
    return poster_map

# Đặt đúng đường dẫn tới file movies.csv của bạn
CSV_PATH   = os.path.join(os.path.dirname(__file__), "../../data2/movies.csv")
POSTER_MAP = _build_poster_map(CSV_PATH)


def get_poster(movie_id: int) -> str:
    """Trả về poster_url, chuỗi rỗng nếu không tìm thấy."""
    return POSTER_MAP.get(int(movie_id), "")



@router.post("/recommend/new-user", response_model=RecommendationResponse)
async def recommend_new_user(req: RecommendationRequest):
    df = recommend_new_user_by_genres_scored(
        req.genres, movies_popular_df, req.top_n, req.alpha
    )

    items = [
        MovieItem(
            movie_id  = int(row["movie_id"]),
            title     = str(row["title"]),
            genres    = str(row["genres"]),
            score     = float(row["final_score"]),
            poster_url= get_poster(int(row["movie_id"]))   # ← thêm ảnh
        )
        for _, row in df.iterrows()
    ]

    return RecommendationResponse(items=items)



@router.post("/recommend/old-user", response_model=OldUserRecommendationResponse)
async def recommend_old_user(req: OldUserRecommendationRequest):
    df = recommend_old_user_by_model(
        user_id   = req.user_id,
        movies_df = movies_df,
        ratings_df= ratings_df,
        model     = model,
        top_n     = req.top_n
    )

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail="User not found or no recommendation available"
        )

    items = [
        OldUserMovieItem(
            movie_id  = int(row["MovieId"]),
            title     = str(row["Title"]),
            genres    = str(row["Genres"]),
            score     = float(row["score"]),
            poster_url= get_poster(int(row["MovieId"]))   # ← thêm ảnh
        )
        for _, row in df.iterrows()
    ]

    return OldUserRecommendationResponse(
        user_id=req.user_id,
        items=items
    )



@router.get("/movies")
async def get_movies(limit: int = 20, offset: int = 0):
  
    entries = list(POSTER_MAP.items())          # [(movie_id, poster_url), ...]
    page    = entries[offset : offset + limit]

    result = []
    for movie_id, poster_url in page:
        # Tìm thêm title/genres từ movies_df nếu có
        row = movies_df[movies_df["MovieId"] == movie_id] if movies_df is not None else None
        if row is not None and not row.empty:
            title  = str(row.iloc[0].get("Title",  ""))
            genres = str(row.iloc[0].get("Genres", ""))
        else:
            title  = ""
            genres = ""
        result.append({
            "movie_id"  : movie_id,
            "title"     : title,
            "genres"    : genres,
            "poster_url": poster_url
        })

    return result



@router.get("/movies/{movie_id}")
async def get_movie(movie_id: int):
    poster_url = POSTER_MAP.get(movie_id)
    if poster_url is None:
        raise HTTPException(status_code=404, detail="Movie not found")

    row = movies_df[movies_df["MovieId"] == movie_id] if movies_df is not None else None
    title  = str(row.iloc[0].get("Title",  "")) if row is not None and not row.empty else ""
    genres = str(row.iloc[0].get("Genres", "")) if row is not None and not row.empty else ""

    return {
        "movie_id"  : movie_id,
        "title"     : title,
        "genres"    : genres,
        "poster_url": poster_url
    }