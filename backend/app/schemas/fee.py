from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FeeBase(BaseModel):
    student_id: int
    amount: float = Field(..., gt=0)
    paid_amount: float = Field(0, ge=0)
    due_date: date
    paid_on: Optional[date] = None


class FeeCreate(FeeBase):
    pass


class FeeUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    paid_amount: Optional[float] = Field(None, ge=0)
    due_date: Optional[date] = None
    paid_on: Optional[date] = None
    status: Optional[str] = Field(None, min_length=1, max_length=20)


class FeeRead(FeeBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
