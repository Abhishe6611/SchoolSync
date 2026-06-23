import datetime
from typing import Optional
from app.models.base import BaseDocument

class Exam(BaseDocument):
    name: str
    term: str
    date: datetime.date
    class_id: int
    max_marks: float
    description: Optional[str] = None
    exam_type: str = "FA1" # FA1, FA2, SA1, FA3, FA4, SA2
    subject_code: Optional[str] = None

    class Settings:
        name = "exams"
