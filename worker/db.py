from supabase import create_client, Client
from worker.config import config

_client: Client = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
    return _client
