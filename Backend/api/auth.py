from fastapi import APIRouter, HTTPException

from schemas.user import RegisterRequest, LoginRequest
from services.user_db import register_user, login_user, get_user_by_id


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
async def register(req: RegisterRequest):
    try:
        user = register_user(
            username=req.username,
            email=req.email,
            password=req.password
        )

        if user is None:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )

        return {
            "message": "Register successfully",
            "user": user
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Register failed: {str(e)}"
        )


@router.post("/login")
async def login(req: LoginRequest):
    try:
        user = login_user(
            email=req.email,
            password=req.password
        )

        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        return {
            "message": "Login successfully",
            "user": user
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/users/{user_id}")
async def get_user(user_id: int):
    user = get_user_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return user