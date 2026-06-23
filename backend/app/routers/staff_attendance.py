from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.core.dependencies import require_roles
from app.schemas.staff_attendance import StaffAttendanceCreate, StaffAttendanceRead, StaffAttendanceBulk
from app.services.staff_attendance_service import (
    mark_staff_attendance,
    mark_bulk_staff_attendance,
    get_staff_attendance_month,
    get_teacher_attendance_percentage
)

router = APIRouter()

@router.post("/mark-all", status_code=status.HTTP_200_OK)
async def create_bulk_staff_attendance(
    bulk_in: StaffAttendanceBulk,
    _=Depends(require_roles(["admin", "superadmin"])),
):
    try:
        return await mark_bulk_staff_attendance(bulk_in)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.post("/", response_model=StaffAttendanceRead, status_code=status.HTTP_200_OK)
async def create_or_update_staff_attendance(
    attendance_in: StaffAttendanceCreate,
    _=Depends(require_roles(["admin", "superadmin"])),
):
    try:
        return await mark_staff_attendance(attendance_in)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

@router.get("/", response_model=List[StaffAttendanceRead])
async def list_staff_attendance(
    year: int,
    month: int,
    _=Depends(require_roles(["admin", "superadmin"])),
):
    return await get_staff_attendance_month(year, month)

@router.get("/my-percentage")
async def get_my_percentage(
    staff_id: int,
    _=Depends(require_roles(["teacher", "admin", "superadmin"])),
):
    return await get_teacher_attendance_percentage(staff_id)
