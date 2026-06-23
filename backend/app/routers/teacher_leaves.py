from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.dependencies import require_roles, get_current_user
from app.models.admin_user import AdminUser
from app.models.teacher_leave import TeacherLeave
from app.models.staff import Staff
from app.schemas.teacher_leave import TeacherLeaveCreate, TeacherLeaveRead, TeacherLeaveAction, TeacherLeaveAdminRead

router = APIRouter()

from beanie.operators import In

@router.post("/", response_model=TeacherLeaveRead)
@router.post("", response_model=TeacherLeaveRead)
async def apply_for_leave(
    leave_in: TeacherLeaveCreate,
    current_user: AdminUser = Depends(require_roles(["teacher"]))
):
    if not current_user.staff_id:
        raise HTTPException(status_code=400, detail="User is not linked to a staff profile")
        
    # Validation 5: No overlapping leaves
    overlap = await TeacherLeave.find(
        TeacherLeave.staff_id == current_user.staff_id,
        In(TeacherLeave.status, ["pending", "approved"]),
        TeacherLeave.from_date <= leave_in.to_date,
        TeacherLeave.to_date >= leave_in.from_date
    ).to_list()
    
    if overlap:
        raise HTTPException(status_code=400, detail="Leave request overlaps with an existing pending or approved leave")
        
    total_days = 0.5 if leave_in.leave_type == "Half Day" else (leave_in.to_date - leave_in.from_date).days + 1
    
    leave = TeacherLeave(
        staff_id=current_user.staff_id,
        leave_type=leave_in.leave_type,
        from_date=leave_in.from_date,
        to_date=leave_in.to_date,
        reason=leave_in.reason,
        status="pending",
        applied_on=datetime.utcnow(),
        total_days=total_days
    )
    await leave.insert()
    return leave

@router.get("/my", response_model=List[TeacherLeaveRead])
async def get_my_leaves(
    current_user: AdminUser = Depends(require_roles(["teacher"]))
):
    if not current_user.staff_id:
        return []
    return await TeacherLeave.find(TeacherLeave.staff_id == current_user.staff_id).sort("-applied_on").to_list()

@router.patch("/{leave_id}/cancel", response_model=TeacherLeaveRead)
async def cancel_my_leave(
    leave_id: int,
    current_user: AdminUser = Depends(require_roles(["teacher"]))
):
    leave = await TeacherLeave.get(leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if leave.staff_id != current_user.staff_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending leaves can be cancelled")
        
    leave.status = "cancelled"
    await leave.save()
    return leave

@router.get("/", response_model=List[TeacherLeaveAdminRead])
@router.get("", response_model=List[TeacherLeaveAdminRead])
async def get_all_leaves(
    status_filter: str = "all",
    _=Depends(require_roles(["admin", "superadmin"]))
):
    query = TeacherLeave.find_all()
    if status_filter != "all":
        query = TeacherLeave.find(TeacherLeave.status == status_filter)
        
    leaves = await query.sort("-applied_on").to_list()
    
    staff_ids = list(set(l.staff_id for l in leaves))
    staff_members = await Staff.find(In(Staff.id, staff_ids)).to_list()
    staff_map = {s.id: f"{s.first_name} {s.last_name}" for s in staff_members}
    
    result = []
    for l in leaves:
        r = l.model_dump()
        r["staff_name"] = staff_map.get(l.staff_id, f"Staff #{l.staff_id}")
        result.append(r)
        
    return result

from datetime import timedelta
from app.services.staff_attendance_service import mark_staff_attendance
from app.schemas.staff_attendance import StaffAttendanceCreate

@router.patch("/{leave_id}/action", response_model=TeacherLeaveRead)
async def process_leave_request(
    leave_id: int,
    action: TeacherLeaveAction,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"]))
):
    leave = await TeacherLeave.get(leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave not found")
    if leave.status != "pending":
        raise HTTPException(status_code=400, detail="Leave is no longer pending")
        
    leave.status = action.status
    leave.admin_remarks = action.admin_remarks
    leave.reviewed_by = current_user.id
    leave.reviewed_on = datetime.utcnow()
    
    await leave.save()

    # If approved, automatically mark staff attendance for those days
    if leave.status == "approved":
        current_date = leave.from_date
        while current_date <= leave.to_date:
            att_status = "Half-Day" if leave.leave_type == "Half Day" else "Leave"
            
            att_in = StaffAttendanceCreate(
                staff_id=leave.staff_id,
                date=current_date,
                status=att_status,
                remarks=f"Approved Leave: {leave.leave_type}"
            )
            # Create or update existing attendance record for this day
            await mark_staff_attendance(att_in)
            
            current_date += timedelta(days=1)

    return leave
