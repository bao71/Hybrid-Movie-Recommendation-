from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.auth import router as user_router
from api.recommendation import router as recommendation_router
from api.post_get_rating import router as rating_router
from api.movies_favorite import router as favorite_router
app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(recommendation_router)
app.include_router(rating_router)
app.include_router(favorite_router)