import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class FeedingSessionCreate(BaseModel):
    baby_id: uuid.UUID
    feed_type: str = Field(..., pattern="^(breast|bottle|solids)$")
    started_at: datetime
    ended_at: datetime | None = None
    left_duration_sec: int | None = None
    right_duration_sec: int | None = None
    amount_ml: float | None = None
    milk_type: str | None = Field(None, pattern="^(breast_milk|formula|water)$")
    food_name: str | None = None
    reaction: str | None = None
    notes: str | None = None


class FeedingSessionUpdate(BaseModel):
    ended_at: datetime | None = None
    left_duration_sec: int | None = None
    right_duration_sec: int | None = None
    amount_ml: float | None = None
    milk_type: str | None = Field(None, pattern="^(breast_milk|formula|water)$")
    food_name: str | None = None
    reaction: str | None = None
    notes: str | None = None


class FeedingSessionResponse(BaseModel):
    id: uuid.UUID
    baby_id: uuid.UUID
    feed_type: str
    started_at: datetime
    ended_at: datetime | None
    left_duration_sec: int | None
    right_duration_sec: int | None
    amount_ml: float | None
    milk_type: str | None
    food_name: str | None
    reaction: str | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
