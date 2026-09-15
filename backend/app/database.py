from supabase import create_client, Client
from app.config import settings
from app.utils.logger import logger

def get_supabase_client() -> Client | None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY or "your_supabase" in settings.SUPABASE_URL or "your_supabase" in settings.SUPABASE_ANON_KEY:
        logger.info("Supabase credentials not configured in .env file.")
        return None
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None

def get_supabase_admin_client() -> Client | None:
    service_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
    if not settings.SUPABASE_URL or not service_key or "your_supabase" in settings.SUPABASE_URL or "your_supabase" in str(service_key):
        logger.info("Supabase admin credentials not configured in .env file.")
        return None
    try:
        client = create_client(settings.SUPABASE_URL, service_key)
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase admin client: {e}")
        return None
