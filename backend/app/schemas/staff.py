from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StaffBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    hire_date: Optional[date] = None
    address: Optional[str] = Field(None, max_length=255)
    gender: Optional[str] = Field(None, min_length=1, max_length=20)
    dob: Optional[date] = None
    blood_group: Optional[str] = Field(None, max_length=10)
    qualification: Optional[str] = Field(None, max_length=100)
    experience_years: Optional[int] = Field(None, ge=0)
    employment_type: Optional[str] = "monthly"
    is_temporary: Optional[bool] = False
    daily_rate: Optional[float] = 0.0


class StaffCreate(StaffBase):
    pass


class StaffUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    hire_date: Optional[date] = None
    address: Optional[str] = Field(None, max_length=255)
    gender: Optional[str] = Field(None, min_length=1, max_length=20)
    dob: Optional[date] = None
    blood_group: Optional[str] = Field(None, max_length=10)
    qualification: Optional[str] = Field(None, max_length=100)
    experience_years: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None
    employment_type: Optional[str] = None
    is_temporary: Optional[bool] = None
    daily_rate: Optional[float] = None


class StaffRead(StaffBase):
    id: int
    is_active: bool
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
