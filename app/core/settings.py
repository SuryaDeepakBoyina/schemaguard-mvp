"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for SchemaGuard Health AI."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "SchemaGuard Health AI"
    app_version: str = "0.1.0"
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    llm_api_key: str | None = Field(default=None, alias="LLM_API_KEY")
    fhir_version: str = Field(default="R4", alias="FHIR_VERSION")
    request_timeout_seconds: int = Field(default=10, alias="REQUEST_TIMEOUT_SECONDS")
    enable_gzip: bool = Field(default=True, alias="ENABLE_GZIP")
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    def cors_origin_list(self) -> list[str]:
        """Return CORS origins normalized for FastAPI middleware."""

        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""

    return Settings()
