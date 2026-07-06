import os
from dotenv import load_dotenv

load_dotenv()


class WorkerConfig:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    HEADLESS: bool = os.getenv("WORKER_HEADLESS", "true").lower() == "true"
    CONCURRENCY: int = int(os.getenv("WORKER_CONCURRENCY", "3"))
    PLAYWRIGHT_TIMEOUT: int = int(os.getenv("PLAYWRIGHT_TIMEOUT", "30000"))

    # Anti-detection
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    ]

    VIEWPORTS = [
        {"width": 1920, "height": 1080},
        {"width": 1440, "height": 900},
        {"width": 1366, "height": 768},
        {"width": 1280, "height": 800},
    ]

    # Scraping delays (ms) - humanized
    SCROLL_DELAY_MIN: int = 800
    SCROLL_DELAY_MAX: int = 1800
    PLACE_DELAY_MIN: int = 500
    PLACE_DELAY_MAX: int = 1200

    # Resource monitoring
    RESOURCE_LOG_INTERVAL: int = 5  # seconds


config = WorkerConfig()
