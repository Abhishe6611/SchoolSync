from datetime import date
from typing import Optional

from app.models.base import BaseDocument

class Attendance(BaseDocument):
    student_id: int
    class_id: int
    date: date
    status: str
    remarks: Optional[str] = None

    class Settings:
        name = "attendance"
