import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ExamBase(BaseModel):
    name: str
    term: str
    date: datetime.date
    class_id: int
    max_marks: float
    description: Optional[str] = None
    exam_type: str = "FA1"
    subject_code: Optional[str] = None

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    name: Optional[str] = None
    term: Optional[str] = None
    date: Optional[datetime.date] = None
    class_id: Optional[int] = None
    max_marks: Optional[float] = None
    description: Optional[str] = None
    exam_type: Optional[str] = None
    subject_code: Optional[str] = None

class ExamRead(ExamBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)
