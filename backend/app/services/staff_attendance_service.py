from datetime import date as date_type
from typing import List

from app.models.staff_attendance import StaffAttendance
from app.models.staff import Staff
from app.schemas.staff_attendance import StaffAttendanceCreate, StaffAttendanceBulk

def calculate_daily_wage_pay(daily_rate: float, status: str, overtime_hours: float = 0.0, advance_deduction: float = 0.0, penalty: float = 0.0, standard_hours: float = 8.0):
    gross_wage = 0.0
    status_lower = status.lower()
    
    if status_lower in ('present', 'leave'):
        gross_wage = daily_rate
    elif status_lower == 'half-day':
        gross_wage = daily_rate / 2
    elif status_lower == 'overtime':
        hourly_rate = daily_rate / standard_hours
        gross_wage = daily_rate + (overtime_hours * hourly_rate)
    elif status_lower == 'absent':
        gross_wage = 0.0

    deductions = (advance_deduction or 0.0) + (penalty or 0.0)
    net_payable = max(gross_wage - deductions, 0.0)

    return {
        "gross_wage": gross_wage,
        "net_payable": net_payable
    }

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
    staff = await Staff.get(attendance_in.staff_id)
    if not staff:
        raise ValueError("Staff not found")

    gross_wage = attendance_in.gross_wage or 0.0
    net_payable = attendance_in.net_payable or 0.0

    if staff.employment_type == "daily":
        pay = calculate_daily_wage_pay(
            daily_rate=staff.daily_rate,
            status=attendance_in.status,
            overtime_hours=attendance_in.overtime_hours or 0.0,
            advance_deduction=attendance_in.advance_deduction or 0.0,
            penalty=attendance_in.penalty or 0.0
        )
        gross_wage = pay["gross_wage"]
        net_payable = pay["net_payable"]

    existing = await StaffAttendance.find_one(
        StaffAttendance.staff_id == attendance_in.staff_id,
        StaffAttendance.date == attendance_in.date
    )
    
    if existing:
        existing.status = attendance_in.status
        if attendance_in.remarks is not None:
            existing.remarks = attendance_in.remarks
        existing.overtime_hours = attendance_in.overtime_hours or 0.0
        existing.advance_deduction = attendance_in.advance_deduction or 0.0
        existing.penalty = attendance_in.penalty or 0.0
        existing.gross_wage = gross_wage
        existing.net_payable = net_payable
        await existing.save()
        return existing
    else:
        new_att = StaffAttendance(
            staff_id=attendance_in.staff_id,
            date=attendance_in.date,
            status=attendance_in.status,
            remarks=attendance_in.remarks,
            overtime_hours=attendance_in.overtime_hours or 0.0,
            advance_deduction=attendance_in.advance_deduction or 0.0,
            penalty=attendance_in.penalty or 0.0,
            gross_wage=gross_wage,
            net_payable=net_payable
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
    
    present = sum(1 for r in records if r.status.lower() in ("present", "leave")) + sum(0.5 for r in records if r.status.lower() == "half-day")
    total = sum(1 for r in records if r.status.lower() in ("present", "absent", "half-day", "leave"))
    
    pct = round((present / total) * 100) if total > 0 else 100
    
    return {"percentage": pct, "present": present, "total": total}
