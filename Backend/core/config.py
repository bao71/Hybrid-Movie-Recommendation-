from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    colab_api_base_url: str

    database_url: str | None = None
    import_database_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()