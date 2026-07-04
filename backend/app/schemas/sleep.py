import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class SleepSessionCreate(BaseModel):
    baby_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None = None
    quality: str | None = Field(None, pattern="^(good|fair|poor)$")
    notes: str | None = None


class SleepSessionUpdate(BaseModel):
    ended_at: datetime | None = None
    quality: str | None = Field(None, pattern="^(good|fair|poor)$")
    notes: str | None = None


class SleepSessionResponse(BaseModel):
    id: uuid.UUID
    baby_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    quality: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
