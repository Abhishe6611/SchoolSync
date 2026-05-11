from datetime import datetime
from typing import Optional

from app.models.base import BaseDocument

class AdminUser(BaseDocument):
    username: str
    email: str
    hashed_password: str
    role: str
    staff_id: Optional[int] = None
    is_active: bool = True
    last_login: Optional[datetime] = None

    class Settings:
        name = "admin_users"
