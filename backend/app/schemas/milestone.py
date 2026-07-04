import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field


class MilestoneCreate(BaseModel):
    baby_id: uuid.UUID
    title: str = Field(..., max_length=255)
    description: str | None = None
    achieved_at: date
    category: str | None = Field(None, max_length=100)
    photo_url: str | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = Field(None, max_length=255)
    description: str | None = None
    achieved_at: date | None = None
    category: str | None = Field(None, max_length=100)
    photo_url: str | None = None


class MilestoneResponse(BaseModel):
    id: uuid.UUID
    baby_id: uuid.UUID
    title: str
    description: str | None
    achieved_at: date
    category: str | None
    photo_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
