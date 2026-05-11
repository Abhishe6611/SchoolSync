from datetime import date
from typing import Optional

from app.models.base import BaseDocument

class StaffAttendance(BaseDocument):
    staff_id: int
    date: date
    status: str
    remarks: Optional[str] = None

    class Settings:
        name = "staff_attendance"
