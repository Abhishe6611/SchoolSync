from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import require_roles
from app.schemas.reports import AttendanceSummary, FeeSummary, ComprehensiveDashboard
from app.services.report_service import get_attendance_summary, get_fee_summary, get_comprehensive_dashboard, get_staff_attendance_summary

router = APIRouter()


@router.get("/attendance", response_model=AttendanceSummary)
async def attendance_report(
    class_id: int,
    start_date: date = Query(..., alias="start"),
    end_date: date = Query(..., alias="end"),
    _=Depends(require_roles(["admin", "superadmin"])),
) -> AttendanceSummary:
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be before end date")
    return await get_attendance_summary(class_id, start_date, end_date)


@router.get("/fees", response_model=list[FeeSummary])
async def fee_report(
    _=Depends(require_roles(["admin", "superadmin"])),
) -> list[FeeSummary]:
    return await get_fee_summary()


@router.get("/dashboard", response_model=ComprehensiveDashboard)
async def dashboard_report(
    _=Depends(require_roles(["admin", "superadmin"])),
) -> ComprehensiveDashboard:
    return await get_comprehensive_dashboard()


@router.get("/staff-attendance", response_model=dict)
async def staff_attendance_report(
    start_date: date = Query(..., alias="start"),
    end_date: date = Query(..., alias="end"),
    _=Depends(require_roles(["admin", "superadmin"])),
) -> dict:
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="Start date must be before end date")
    return await get_staff_attendance_summary(start_date, end_date)
