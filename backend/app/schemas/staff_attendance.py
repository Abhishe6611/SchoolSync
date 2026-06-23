from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, validator, root_validator

class StaffAttendanceBase(BaseModel):
    staff_id: int
    date: date
    status: str
    remarks: Optional[str] = None
    overtime_hours: float = Field(default=0.0, ge=0.0, le=12.0)
    advance_deduction: float = Field(default=0.0, ge=0.0)
    penalty: float = Field(default=0.0, ge=0.0)
    gross_wage: Optional[float] = 0.0
    net_payable: Optional[float] = 0.0

    @validator('status')
    def validate_status(cls, v):
        allowed = ['present', 'absent', 'half-day', 'overtime', 'holiday', 'training']
        val = v.lower().replace(' ', '-')
        if val not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return val

    @root_validator(skip_on_failure=True)
    def check_overtime(cls, values):
        status = values.get('status', '')
        overtime = values.get('overtime_hours', 0.0)
        if status != 'overtime' and overtime > 0:
            raise ValueError("overtime_hours should be 0 unless status is 'overtime'")
        return values

class StaffAttendanceCreate(StaffAttendanceBase):
    pass

class StaffAttendanceUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None
    overtime_hours: Optional[float] = None
    advance_deduction: Optional[float] = None
    penalty: Optional[float] = None
    gross_wage: Optional[float] = None
    net_payable: Optional[float] = None

class StaffAttendanceRead(StaffAttendanceBase):
    id: int

class StaffAttendanceBulk(BaseModel):
    date: date
    status: str
