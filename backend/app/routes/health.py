from datetime import datetime, timezone
from fastapi import APIRouter
from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
