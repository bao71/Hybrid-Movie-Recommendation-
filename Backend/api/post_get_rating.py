from fastapi import APIRouter, HTTPException, Body

from services.few_user import save_rating, get_user_ratings


router = APIRouter(tags=["Ratings"])


@router.post("/ratings")
async def create_or_update_rating(payload: dict = Body(...)):
    try:
        user_id = int(payload.get("user_id"))
        movie_id = int(payload.get("movie_id"))
        rating = float(payload.get("rating"))

        if rating < 0.5 or rating > 5:
            raise HTTPException(
                status_code=400,
                detail="rating must be between 0.5 and 5"
            )

        data = save_rating(
            user_id=user_id,
            movie_id=movie_id,
            rating=rating
        )

        return {
            "message": "Rating saved",
            "rating": data
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot save rating: {str(e)}"
        )


@router.get("/users/{user_id}/ratings")
async def list_user_ratings(user_id: int, limit: int = 50):
    try:
        return get_user_ratings(user_id=user_id, limit=limit)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot load user ratings: {str(e)}"
        )