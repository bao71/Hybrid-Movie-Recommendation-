from fastapi import APIRouter, HTTPException, Body

from services.favorite_db import (
    add_favorite,
    get_user_favorites,
    remove_favorite,
    is_favorite
)


router = APIRouter(tags=["Favorites"])


@router.post("/favorites")
async def create_favorite(payload: dict = Body(...)):
    try:
        user_id = payload.get("user_id")
        movie_id = payload.get("movie_id")

        if user_id is None:
            raise HTTPException(
                status_code=400,
                detail="user_id is required"
            )

        if movie_id is None:
            raise HTTPException(
                status_code=400,
                detail="movie_id is required"
            )

        user_id = int(user_id)
        movie_id = int(movie_id)

        favorite = add_favorite(
            user_id=user_id,
            movie_id=movie_id
        )

        if favorite is None:
            raise HTTPException(
                status_code=404,
                detail="Movie not found"
            )

        return {
            "message": "Favorite saved",
            "favorite": favorite
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot save favorite: {str(e)}"
        )


@router.get("/users/{user_id}/favorites")
async def list_favorites(user_id: int):
    try:
        return get_user_favorites(user_id)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot load favorites: {str(e)}"
        )


@router.delete("/users/{user_id}/favorites/{movie_id}")
async def delete_favorite(user_id: int, movie_id: int):
    try:
        deleted = remove_favorite(
            user_id=user_id,
            movie_id=movie_id
        )

        if deleted is None:
            raise HTTPException(
                status_code=404,
                detail="Favorite not found"
            )

        return {
            "message": "Favorite removed",
            "favorite": deleted
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot remove favorite: {str(e)}"
        )


@router.get("/users/{user_id}/favorites/{movie_id}")
async def check_favorite(user_id: int, movie_id: int):
    try:
        return {
            "user_id": user_id,
            "movie_id": movie_id,
            "is_favorite": is_favorite(user_id, movie_id)
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cannot check favorite: {str(e)}"
        )