from typing import Optional
from pydantic import BaseModel, ConfigDict

class GradeBase(BaseModel):
    exam_id: int
    student_id: int
    subject_id: int
    marks_obtained: float
    internal_marks: Optional[float] = 0.0
    external_marks: Optional[float] = 0.0
    remarks: Optional[str] = None

class GradeCreate(GradeBase):
    pass

class GradeUpdate(BaseModel):
    marks_obtained: Optional[float] = None
    internal_marks: Optional[float] = None
    external_marks: Optional[float] = None
    remarks: Optional[str] = None

class GradeRead(GradeBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)
