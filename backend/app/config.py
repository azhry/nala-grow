from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/nalagrow"
    cors_origins: str = '["http://localhost:3000"]'
    app_name: str = "NalaGrow"
    version: str = "0.1.0"

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.cors_origins)


settings = Settings()
