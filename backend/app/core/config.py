import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME: str = "PhotoViewer"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION_SECRET_KEY_12345"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    ALGORITHM: str = "HS256"
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Logging
    LOG_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "logs",
    )


settings = Settings()
os.makedirs(settings.LOG_DIR, exist_ok=True)
