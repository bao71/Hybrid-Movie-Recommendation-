from pydantic import BaseModel
from typing import List


class RecommendationRequest(BaseModel):
    genres: List[str]
    top_n: int = 10
    alpha: float = 0.7

class OldUserRecommendationRequest(BaseModel):
    user_id: int
    top_n: int = 10


class OldUserMovieItem(BaseModel):
    movie_id: int
    title: str
    genres: str
    score: float
    poster_url: str = ""

class OldUserRecommendationResponse(BaseModel):
    user_id: int
    items: List[OldUserMovieItem]

class MovieItem(BaseModel):
    movie_id: int
    title: str
    genres: str
    score: float
    poster_url: str = ""


class RecommendationResponse(BaseModel):
    items: List[MovieItem]