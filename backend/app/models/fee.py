from datetime import date
from typing import Optional

from app.models.base import BaseDocument

class Fee(BaseDocument):
    student_id: int
    amount: float
    paid_amount: float = 0
    due_date: date
    paid_on: Optional[date] = None
    status: str

    class Settings:
        name = "fees"
