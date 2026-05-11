from app.models.base import BaseDocument

class Subject(BaseDocument):
    name: str
    code: str
    class_id: int

    class Settings:
        name = "subjects"
