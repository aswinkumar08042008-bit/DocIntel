"""All settings are read from environment variables (see .env.example)."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/docinsight"
    app_api_key: str = ""
    max_files: int = 20
    max_file_mb: int = 15
    max_context_chars: int = 400_000
    max_sheet_rows: int = 2000
    cors_origins: str = "http://localhost:5173"
    upload_dir: str = "uploads"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
