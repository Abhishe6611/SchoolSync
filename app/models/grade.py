from typing import Optional
from app.models.base import BaseDocument

class Grade(BaseDocument):
    exam_id: int
    student_id: int
    subject_id: int
    marks_obtained: float
    remarks: Optional[str] = None

    class Settings:
        name = "grades"
