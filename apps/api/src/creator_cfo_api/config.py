from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Creator CFO API"
    api_prefix: str = "/api/v1"
    environment: str = Field(default="development")

    model_config = SettingsConfigDict(env_prefix="CREATOR_CFO_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

