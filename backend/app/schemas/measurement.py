import uuid
from datetime import date, datetime
from pydantic import BaseModel, Field


class GrowthMeasurementCreate(BaseModel):
    baby_id: uuid.UUID
    date: date
    weight_kg: float | None = None
    height_cm: float | None = None
    head_cm: float | None = None
    notes: str | None = None


class GrowthMeasurementUpdate(BaseModel):
    date: date | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    head_cm: float | None = None
    notes: str | None = None


class GrowthMeasurementResponse(BaseModel):
    id: uuid.UUID
    baby_id: uuid.UUID
    date: date
    weight_kg: float | None
    height_cm: float | None
    head_cm: float | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
