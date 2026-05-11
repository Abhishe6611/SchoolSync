from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StudentBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    dob: date
    gender: str = Field(..., min_length=1, max_length=20)
    email: EmailStr
    phone: str = Field(..., max_length=30)
    address: str = Field(..., max_length=255)
    admission_date: date
    class_id: int

    # Expanded details
    religion: str = Field(..., max_length=100)
    blood_group: str = Field(..., max_length=10)
    nationality: str = Field(..., max_length=100)
    
    father_name: str = Field(..., max_length=100)
    mother_name: str = Field(..., max_length=100)
    parent_contact: str = Field(..., max_length=30)
    parent_occupation: str = Field(..., max_length=100)
    
    transport_route_id: Optional[int] = None
    pickup_point: Optional[str] = Field(None, max_length=255)
    
    base_fee: float = 0.0
    discount_amount: float = 0.0
    discount_reason: Optional[str] = Field(None, max_length=255)
    transport_fee: float = 0.0
    other_fee: float = 0.0
    total_fee: float = 0.0


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    dob: Optional[date] = None
    gender: Optional[str] = Field(None, min_length=1, max_length=20)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    admission_date: Optional[date] = None
    class_id: Optional[int] = None
    is_active: Optional[bool] = None

    religion: Optional[str] = Field(None, max_length=100)
    blood_group: Optional[str] = Field(None, max_length=10)
    nationality: Optional[str] = Field(None, max_length=100)
    
    father_name: Optional[str] = Field(None, max_length=100)
    mother_name: Optional[str] = Field(None, max_length=100)
    parent_contact: Optional[str] = Field(None, max_length=30)
    parent_occupation: Optional[str] = Field(None, max_length=100)
    
    transport_route_id: Optional[int] = None
    pickup_point: Optional[str] = Field(None, max_length=255)
    
    base_fee: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_reason: Optional[str] = Field(None, max_length=255)
    transport_fee: Optional[float] = None
    other_fee: Optional[float] = None
    total_fee: Optional[float] = None


class StudentRead(StudentBase):
    id: int
    is_active: bool
    photo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
