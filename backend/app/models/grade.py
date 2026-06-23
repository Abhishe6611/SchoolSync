from typing import Optional
from app.models.base import BaseDocument

class Grade(BaseDocument):
    exam_id: int
    student_id: int
    subject_id: int
    marks_obtained: float
    internal_marks: Optional[float] = 0.0
    external_marks: Optional[float] = 0.0
    remarks: Optional[str] = None

    class Settings:
        name = "grades"
