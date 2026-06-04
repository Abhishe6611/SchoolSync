from datetime import date, datetime
from typing import Optional
from app.models.base import BaseDocument

class TeacherLeave(BaseDocument):
    staff_id: int              # Links to Staff model
    leave_type: str            # Casual Leave, Sick Leave, Earned Leave, Maternity Leave, Half Day
    from_date: date
    to_date: date
    reason: str
    status: str = "pending"    # pending | approved | rejected | cancelled
    applied_on: datetime
    reviewed_by: Optional[int] = None   # admin user id
    reviewed_on: Optional[datetime] = None
    admin_remarks: Optional[str] = None
    total_days: float          # Supports 0.5 for half day

    class Settings:
        name = "teacher_leaves"
