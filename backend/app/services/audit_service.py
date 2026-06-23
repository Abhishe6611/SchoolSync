from typing import Any, Dict, Optional

from app.models.audit_log import AuditLog

async def log_activity(
    user_id: int,
    user_email: str,
    action: str,
    entity: str,
    entity_id: str | int,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Asynchronously creates an audit log entry in the database.
    """
    log = AuditLog(
        user_id=user_id,
        user_email=user_email,
        action=action.upper(),
        entity=entity,
        entity_id=entity_id,
        details=details
    )
    await log.insert()

async def get_audit_logs(skip: int = 0, limit: int = 100) -> list[AuditLog]:
    return await AuditLog.find_all().sort("-created_at").skip(skip).limit(limit).to_list()
