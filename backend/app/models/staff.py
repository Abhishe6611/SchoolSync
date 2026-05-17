from datetime import date
from typing import Optional
from pydantic import Field

from app.models.base import BaseDocument

class Staff(BaseDocument):
    first_name: str
    last_name: str
    role: Optional[str] = "Teacher"
    email: Optional[str] = ""
    phone: Optional[str] = ""
    hire_date: Optional[date] = None
    address: Optional[str] = ""
    gender: Optional[str] = "Unknown"
    dob: Optional[date] = Field(default_factory=lambda: date(1990, 1, 1))
    blood_group: Optional[str] = "Unknown"
    qualification: Optional[str] = ""
    experience_years: Optional[int] = 0
    is_active: bool = True
    photo_url: Optional[str] = None
    employment_type: str = "monthly"
    is_temporary: bool = False
    daily_rate: float = 0.0

    class Settings:
        name = "staff"
