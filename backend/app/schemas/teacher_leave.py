from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator

class TeacherLeaveCreate(BaseModel):
    leave_type: str = Field(..., description="Casual Leave, Sick Leave, Earned Leave, Maternity Leave, Half Day")
    from_date: date
    to_date: date
    reason: str
    
    @model_validator(mode='after')
    def validate_leave_request(self):
        # Validation 1: from_date <= to_date
        if self.from_date > self.to_date:
            raise ValueError("from_date cannot be after to_date")
        
        # Validation 2: No past dates
        if self.from_date < date.today():
            raise ValueError("Cannot apply for leave on past dates")
            
        # Validation 3: Sick Leave requires reason
        if self.leave_type == "Sick Leave" and not self.reason.strip():
            raise ValueError("Reason is mandatory for Sick Leave")
            
        # Validation 4: Max leave days is 30
        delta = (self.to_date - self.from_date).days + 1
        if self.leave_type == "Half Day":
            delta = 0.5
            if self.from_date != self.to_date:
                raise ValueError("Half Day leave must be for a single date")
                
        if delta > 30:
            raise ValueError("Cannot apply for more than 30 days of leave at once")
            
        return self

class TeacherLeaveAction(BaseModel):
    status: str = Field(..., description="approved or rejected")
    admin_remarks: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_action(self):
        if self.status not in ("approved", "rejected"):
            raise ValueError("Status must be 'approved' or 'rejected'")
        return self

class TeacherLeaveRead(BaseModel):
    id: int
    staff_id: int
    leave_type: str
    from_date: date
    to_date: date
    reason: str
    status: str
    applied_on: datetime
    reviewed_by: Optional[int] = None
    reviewed_on: Optional[datetime] = None
    admin_remarks: Optional[str] = None
    total_days: float
    
    class Config:
        from_attributes = True

class TeacherLeaveAdminRead(TeacherLeaveRead):
    staff_name: str
