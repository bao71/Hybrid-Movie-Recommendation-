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

router = APIRouter()

movies_popular_df = load_movies_popular()
movies_df = load_movies()
ratings_df = load_ratings()
model = load_model()



@router.post("/recommend/new-user", response_model=RecommendationResponse)
async def recommend_new_user(req: RecommendationRequest):
    df = recommend_new_user_by_genres_scored(
        req.genres, movies_popular_df, req.top_n, req.alpha
    )

    items = [
        MovieItem(
            movie_id=int(row["movie_id"]),
            title=str(row["title"]),
            genres=str(row["genres"]),
            score=float(row["final_score"])
        )
        for _, row in df.iterrows()
    ]

    return RecommendationResponse(items=items)


@router.post("/recommend/old-user", response_model=OldUserRecommendationResponse)
async def recommend_old_user(req: OldUserRecommendationRequest):
    df = recommend_old_user_by_model(
        user_id=req.user_id,
        movies_df=movies_df,
        ratings_df=ratings_df,
        model=model,
        top_n=req.top_n
    )

    if df.empty:
        raise HTTPException(status_code=404, detail="User not found or no recommendation available")

    items = [
        OldUserMovieItem(
            movie_id=int(row["MovieId"]),
            title=str(row["Title"]),
            genres=str(row["Genres"]),
            score=float(row["score"])
        )
        for _, row in df.iterrows()
    ]

    return OldUserRecommendationResponse(
        user_id=req.user_id,
        items=items
    )