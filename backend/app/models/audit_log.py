from datetime import datetime
from typing import Any, Dict, Optional

from app.models.base import BaseDocument

class AuditLog(BaseDocument):
    user_id: int
    user_email: str
    action: str  # "CREATE", "UPDATE", "DELETE"
    entity: str  # "Student", "Staff", "Fee", etc.
    entity_id: str | int
    details: Optional[Dict[str, Any]] = None
    
    class Settings:
        name = "audit_logs"
