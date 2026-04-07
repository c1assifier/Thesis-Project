from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Adaptive Python Learning System"
    database_url: str = "postgresql://postgres:postgres@postgres:5432/adaptive_learning"
    llm_enabled: bool = False
    llm_provider: str = "ollama"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    cors_origins: str = "http://localhost:5173,http://frontend:5173"
    seed_data_path: str = "app/data/course_seed.json"
    diagnostic_seed_data_path: str = "app/data/diagnostic_seed.json"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
