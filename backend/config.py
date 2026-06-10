from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str

    # PostgreSQL
    database_url: str

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Neo4j
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str

    # ChromaDB
    chroma_host: str = "chromadb"
    chroma_port: int = 8000

    # Auth
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 7

    # Agent
    grade_threshold: float = 0.70
    max_retries: int = 2
    contextual_retrieval: bool = False

    # Upload
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
