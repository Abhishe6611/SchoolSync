from datetime import date
from typing import Optional
from pydantic import BaseModel

class StaffAttendanceBase(BaseModel):
    staff_id: int
    date: date
    status: str
    remarks: Optional[str] = None

class StaffAttendanceCreate(StaffAttendanceBase):
    pass

class StaffAttendanceUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None

class StaffAttendanceRead(StaffAttendanceBase):
    id: int

class StaffAttendanceBulk(BaseModel):
    date: date
    status: str
