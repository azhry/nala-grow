import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field


class BabyProfileCreate(BaseModel):
    name: str = Field(..., max_length=255)
    dob: date
    sex: str = Field(default="unspecified", pattern="^(male|female|unspecified)$")
    photo_url: str | None = None


class BabyProfileUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    dob: date | None = None
    sex: str | None = Field(None, pattern="^(male|female|unspecified)$")
    photo_url: str | None = None


class BabyProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    dob: date
    sex: str
    photo_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
