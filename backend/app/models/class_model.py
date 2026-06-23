from typing import Optional

from app.models.base import BaseDocument

class ClassModel(BaseDocument):
    name: str
    section: str
    year: str
    advisor_id: Optional[int] = None

    class Settings:
        name = "classes"
