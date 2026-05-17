from fastapi import APIRouter, HTTPException, Body
import httpx
from services.few_user import (
    recommend_few_rating_user,
    get_user_rating_count
)
from services.colab_client import colab_client
from services.movie_db import (
    fetch_movies,
    fetch_movie_by_id,
    search_movies,
    enrich_items_with_db
)


router = APIRouter()


@router.post("/recommend/smart")
async def recommend_smart(payload: dict = Body(...)):
    try:
        user_id = payload.get("user_id")
        top_n = int(payload.get("top_n", 10))
        genres = payload.get("genres", [])
        alpha = float(payload.get("alpha", 0.7))

        if user_id is None:
            if not genres:
                raise HTTPException(
                    status_code=400,
                    detail="user_id or genres is required"
                )

            ai_data = await colab_client.post(
                "/recommend/new-user",
                json={
                    "genres": genres,
                    "top_n": top_n,
                    "alpha": alpha
                }
            )

            items = ai_data.get("items", [])
            ai_data["items"] = enrich_items_with_db(items)
            ai_data["mode"] = "cold-start-no-user"

            return ai_data

        user_id = int(user_id)
        rating_count = get_user_rating_count(user_id)

        # Case 1: User cũ trong MovieLens, đã nằm trong SVD model
        if user_id <= 6040:
            ai_data = await colab_client.post(
                "/recommend/old-user",
                json={
                    "user_id": user_id,
                    "top_n": top_n
                }
            )

            items = ai_data.get("items", [])
            ai_data["items"] = enrich_items_with_db(items)
            ai_data["mode"] = "old-user-svd"
            ai_data["rating_count"] = rating_count

            return ai_data

        # Case 2: User mới nhưng đã có một vài rating
        if rating_count > 0:
            items = recommend_few_rating_user(
                user_id=user_id,
                top_n=top_n
            )

            return {
                "user_id": user_id,
                "mode": "few-rating-hybrid",
                "rating_count": rating_count,
                "items": items
            }

        # Case 3: User mới hoàn toàn, chưa rating phim nào
        if not genres:
            genres = ["Action", "Drama", "Comedy"]

        ai_data = await colab_client.post(
            "/recommend/new-user",
            json={
                "genres": genres,
                "top_n": top_n,
                "alpha": alpha
            }
        )

        items = ai_data.get("items", [])
        ai_data["items"] = enrich_items_with_db(items)
        ai_data["mode"] = "cold-start-genres"
        ai_data["rating_count"] = rating_count

        return ai_data

    except HTTPException:
        raise

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.text
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot smart recommend: {str(e)}"
        )

@router.get("/")
async def home():
    return {
        "message": "Local backend is running"
    }


@router.get("/movies")
async def get_movies(
    limit: int = 20,
    offset: int = 0,
    genre: str | None = None
):
    try:
        return fetch_movies(
            limit=limit,
            offset=offset,
            genre=genre
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot load movies from DB: {str(e)}"
        )


# Chú ý: route này phải đặt TRƯỚC /movies/{movie_id}
@router.get("/movies/search")
async def search_movie_api(q: str, limit: int = 20):
    try:
        return search_movies(q=q, limit=limit)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot search movies from DB: {str(e)}"
        )


@router.get("/movies/{movie_id}")
async def get_movie(movie_id: int):
    try:
        movie = fetch_movie_by_id(movie_id)

        if not movie:
            raise HTTPException(
                status_code=404,
                detail="Movie not found"
            )

        return movie

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot load movie from DB: {str(e)}"
        )


@router.post("/recommend/few-rating-user")
async def recommend_few_rating_user_api(payload: dict = Body(...)):
    try:
        user_id = payload.get("user_id")
        top_n = int(payload.get("top_n", 10))

        if user_id is None:
            raise HTTPException(
                status_code=400,
                detail="user_id is required"
            )

        user_id = int(user_id)

        items = recommend_few_rating_user(
            user_id=user_id,
            top_n=top_n
        )

        return {
            "user_id": user_id,
            "mode": "few-rating-hybrid",
            "items": items
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot recommend few-rating user: {str(e)}"
        )


@router.post("/recommend/new-user")
async def recommend_new_user(payload: dict = Body(...)):
    try:
        genres = payload.get("genres", [])
        top_n = int(payload.get("top_n", 10))
        alpha = float(payload.get("alpha", 0.7))

        if not genres:
            raise HTTPException(
                status_code=400,
                detail="genres is required"
            )

        ai_data = await colab_client.post(
            "/recommend/new-user",
            json={
                "genres": genres,
                "top_n": top_n,
                "alpha": alpha
            }
        )

        items = ai_data.get("items", [])
        ai_data["items"] = enrich_items_with_db(items)

        return ai_data

    except HTTPException:
        raise

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.text
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot recommend new user: {str(e)}"
        )


@router.post("/recommend/old-user")
async def recommend_old_user(payload: dict = Body(...)):
    try:
        user_id = payload.get("user_id")
        top_n = int(payload.get("top_n", 10))

        if user_id is None:
            raise HTTPException(
                status_code=400,
                detail="user_id is required"
            )

        user_id = int(user_id)

        ai_data = await colab_client.post(
            "/recommend/old-user",
            json={
                "user_id": user_id,
                "top_n": top_n
            }
        )

        items = ai_data.get("items", [])
        ai_data["items"] = enrich_items_with_db(items)

        return ai_data

    except HTTPException:
        raise

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.text
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot recommend old user: {str(e)}"
        )
    


