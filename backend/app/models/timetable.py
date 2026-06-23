from typing import List, Optional, Dict, Any
from app.models.base import BaseDocument
from pydantic import BaseModel, Field

class Timetable(BaseDocument):
    class_id: int
    name: str = Field(..., description="E.g. Class 6A Timetable")
    year: str = Field(..., description="Academic Year")
    settings: Dict[str, Any] = Field(..., description="Start time, breaks, etc.")
    grid: List[List[Optional[Dict[str, str]]]] = Field(
        ..., 
        description="2D array [day][period]. Each cell contains {'subject': str, 'teacher': str, 'type': 'Class'|'Break'}"
    )

    class Settings:
        name = "timetables"
