from datetime import date
from typing import Optional

from app.models.base import BaseDocument

class Student(BaseDocument):
    first_name: str
    last_name: str
    dob: date
    gender: str
    email: str
    phone: str
    address: str
    admission_date: date
    is_active: bool = True
    photo_url: Optional[str] = None
    class_id: int

    # Expanded details
    religion: str
    blood_group: str
    nationality: str
    
    father_name: str
    mother_name: str
    parent_contact: str
    parent_occupation: str
    
    transport_route_id: Optional[int] = None
    pickup_point: Optional[str] = None
    
    base_fee: float = 0.0
    discount_amount: float = 0.0
    discount_reason: Optional[str] = None
    transport_fee: float = 0.0
    other_fee: float = 0.0
    total_fee: float = 0.0

    class Settings:
        name = "students"
