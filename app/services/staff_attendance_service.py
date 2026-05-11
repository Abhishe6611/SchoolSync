from datetime import date as date_type
from typing import List

from app.models.staff_attendance import StaffAttendance
from app.models.staff import Staff
from app.schemas.staff_attendance import StaffAttendanceCreate, StaffAttendanceBulk

async def mark_bulk_staff_attendance(bulk_in: StaffAttendanceBulk):
    staff_members = await Staff.find(Staff.is_active == True).to_list()
    for staff in staff_members:
        att_in = StaffAttendanceCreate(
            staff_id=staff.id,
            date=bulk_in.date,
            status=bulk_in.status,
            remarks=""
        )
        await mark_staff_attendance(att_in)
    return {"message": f"Successfully marked {len(staff_members)} staff members as {bulk_in.status}"}

async def mark_staff_attendance(attendance_in: StaffAttendanceCreate) -> StaffAttendance:
    existing = await StaffAttendance.find_one(
        StaffAttendance.staff_id == attendance_in.staff_id,
        StaffAttendance.date == attendance_in.date
    )
    
    if existing:
        existing.status = attendance_in.status
        if attendance_in.remarks is not None:
            existing.remarks = attendance_in.remarks
        await existing.save()
        return existing
    else:
        new_att = StaffAttendance(
            staff_id=attendance_in.staff_id,
            date=attendance_in.date,
            status=attendance_in.status,
            remarks=attendance_in.remarks
        )
        return await new_att.insert()

async def get_staff_attendance_month(year: int, month: int) -> List[StaffAttendance]:
    start_date = date_type(year, month, 1)
    if month == 12:
        end_date = date_type(year + 1, 1, 1)
    else:
        end_date = date_type(year, month + 1, 1)
        
    return await StaffAttendance.find(
        StaffAttendance.date >= start_date,
        StaffAttendance.date < end_date
    ).to_list()

async def get_teacher_attendance_percentage(staff_id: int) -> dict:
    today = date_type.today()
    first_of_month = today.replace(day=1)
    
    records = await StaffAttendance.find(
        StaffAttendance.staff_id == staff_id,
        StaffAttendance.date >= first_of_month,
        StaffAttendance.date <= today
    ).to_list()
    
    present = sum(1 for r in records if r.status.lower() == "present")
    total = sum(1 for r in records if r.status.lower() in ("present", "absent"))
    
    pct = round((present / total) * 100) if total > 0 else 100
    
    return {"percentage": pct, "present": present, "total": total}
