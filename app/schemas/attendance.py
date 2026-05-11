from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AttendanceBase(BaseModel):
    student_id: int
    class_id: int
    date: date
    status: str = Field(..., min_length=1, max_length=20)
    remarks: Optional[str] = Field(None, max_length=255)


class AttendanceCreate(AttendanceBase):
    pass


class AttendanceUpdate(BaseModel):
    status: Optional[str] = Field(None, min_length=1, max_length=20)
    remarks: Optional[str] = Field(None, max_length=255)


class AttendanceRead(AttendanceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
