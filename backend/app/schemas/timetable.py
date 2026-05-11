from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class TimetableAllocation(BaseModel):
    class_id: int
    subject: str
    teacher_id: int
    teacher_name: str
    periods_per_week: int

class TimetableSettings(BaseModel):
    days_per_week: int = 6
    periods_per_day: int = 6
    start_time: str = "08:45 AM"
    period_duration_minutes: int = 60
    lunch_after_period: int = 4
    lunch_duration_minutes: int = 60
    short_break_after_period: int = 2
    short_break_duration_minutes: int = 15

class TimetableGenerateRequest(BaseModel):
    class_ids: List[int]
    allocations: List[TimetableAllocation]
    settings: TimetableSettings

class TimetableSaveRequest(BaseModel):
    class_id: int
    name: str
    year: str
    settings: Dict[str, Any]
    grid: List[List[Optional[Dict[str, str]]]]
