from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ClassBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    section: str = Field(..., min_length=1, max_length=50)
    year: str = Field(..., min_length=1, max_length=20)
    advisor_id: Optional[int] = None


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    section: Optional[str] = Field(None, min_length=1, max_length=50)
    year: Optional[str] = Field(None, min_length=1, max_length=20)
    advisor_id: Optional[int] = None


class ClassRead(ClassBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
