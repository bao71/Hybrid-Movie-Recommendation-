import pandas as pd
import pickle


def load_movies_popular():
    df = pd.read_csv("data/popular_movies.csv")
    df = df.rename(columns={
        "MovieID": "movie_id",
        "MovieId": "movie_id",
        "movieId": "movie_id",
        "Title": "title",
        "Genres": "genres",
    })
    return df


def load_movies():
    return pd.read_csv('movies.dat', sep='::', engine='python', 
                     names=['MovieId', 'Title', 'Genres'])


def load_ratings():
    return pd.read_csv('ratings.dat', sep='::', engine='python', 
                      names=['UserId', 'MovieId', 'Rating', 'Timestamp'])


def load_model():
    with open("data/svd_model.pkl", "rb") as f:
        return pickle.load(f)