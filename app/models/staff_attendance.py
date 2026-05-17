from datetime import date
from typing import Optional

from app.models.base import BaseDocument

class StaffAttendance(BaseDocument):
    staff_id: int
    date: date
    status: str
    remarks: Optional[str] = None
    overtime_hours: float = 0.0
    advance_deduction: float = 0.0
    penalty: float = 0.0
    gross_wage: float = 0.0
    net_payable: float = 0.0

    class Settings:
        name = "staff_attendance"
