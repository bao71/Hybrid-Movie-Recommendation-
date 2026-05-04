import pandas as pd
from typing import List

def recommend_new_user_by_genres_scored(
    preferred_genres: List[str],
    popular_movies: pd.DataFrame,
    top_n: int = 10,
    alpha: float = 0.7
) -> pd.DataFrame:
    df = popular_movies.copy()
    preferred_set = set(g.lower() for g in preferred_genres)

    def count_matches(genres_str):
        genres = set(genres_str.lower().split("|")) if pd.notna(genres_str) else set()
        return len(preferred_set.intersection(genres))

    df["genre_match_count"] = df["genres"].apply(count_matches)
    df = df[df["genre_match_count"] > 0].copy()

    if df.empty:
        return df

    gmin, gmax = df["genre_match_count"].min(), df["genre_match_count"].max()
    pmin, pmax = df["pop_score"].min(), df["pop_score"].max()

    df["genre_match_norm"] = (df["genre_match_count"] - gmin) / (gmax - gmin) if gmax > gmin else 1
    df["pop_score_norm"] = (df["pop_score"] - pmin) / (pmax - pmin) if pmax > pmin else 1

    df["final_score"] = alpha * df["genre_match_norm"] + (1 - alpha) * df["pop_score_norm"]

    return df.sort_values(by="final_score", ascending=False).head(top_n)



def recommend_old_user_by_model(
    user_id: int,
    movies_df: pd.DataFrame,
    ratings_df: pd.DataFrame,
    model,
    top_n: int = 10
) -> pd.DataFrame:
    #if user_id not in ratings_df["UserId"].values:
        #return pd.DataFrame()

    watched_movie_ids = set(
        ratings_df.loc[ratings_df["UserId"] == user_id, "MovieId"].tolist()
    )

    candidate_movies = movies_df[~movies_df["MovieId"].isin(watched_movie_ids)].copy()

    #if candidate_movies.empty:
    #    return pd.DataFrame()

    candidate_movies["score"] = candidate_movies["MovieId"].apply(
        lambda movie_id: model.predict(user_id, movie_id).est
    )

    candidate_movies = candidate_movies.sort_values(by="score", ascending=False).head(top_n)
    return candidate_movies
