from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.audit_log import AuditLog
from app.services.audit_service import get_audit_logs
from app.core.dependencies import get_current_user
from app.models.admin_user import AdminUser

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/")
async def read_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: AdminUser = Depends(get_current_user),
):
    """
    Retrieve audit logs.
    Only super admins should technically have access, but for this MVP,
    any authenticated admin can view the logs.
    """
    logs = await get_audit_logs(skip=skip, limit=limit)
    total = await AuditLog.count()
    return {
        "items": logs,
        "total": total,
        "page": (skip // limit) + 1,
        "pages": (total // limit) + (1 if total % limit > 0 else 0)
    }
