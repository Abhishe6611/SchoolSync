from datetime import date as date_type, datetime, timedelta
from app.models.attendance import Attendance
from app.models.class_model import ClassModel
from app.models.student import Student
from app.schemas.attendance import AttendanceCreate, AttendanceUpdate
from typing import Optional

async def mark_attendance(attendance_in: AttendanceCreate) -> Attendance:
    student = await Student.get(attendance_in.student_id)
    if not student:
        raise ValueError("Student not found")

    class_model = await ClassModel.get(attendance_in.class_id)
    if not class_model:
        raise ValueError("Class not found")

    if student.class_id != attendance_in.class_id:
        raise ValueError("Student does not belong to the class")

    # Combine query dict correctly
    # Note: date in pymongo will be a datetime, but we'll query exactly as Beanie parses it
    date_str = attendance_in.date.strftime("%Y-%m-%d") if hasattr(attendance_in.date, "strftime") else attendance_in.date
    
    # Simple query using object comparison in Beanie
    existing = await Attendance.find_one(
        Attendance.student_id == attendance_in.student_id,
        Attendance.date == attendance_in.date
    )
    
    if existing:
        existing.status = attendance_in.status
        existing.remarks = attendance_in.remarks
        await existing.save()
        return existing

    attendance = Attendance(**attendance_in.model_dump())
    await attendance.insert()
    return attendance

async def get_attendance(attendance_id: int) -> Attendance | None:
    return await Attendance.get(attendance_id)

async def get_attendance_list(skip: int = 0, limit: int = 100, class_id: Optional[int] = None) -> list[Attendance]:
    query = Attendance.find_all()
    if class_id is not None:
        query = Attendance.find(Attendance.class_id == class_id)
    return await query.skip(skip).limit(limit).to_list()

async def update_attendance(attendance: Attendance, attendance_in: AttendanceUpdate) -> Attendance:
    for field, value in attendance_in.model_dump(exclude_unset=True).items():
        setattr(attendance, field, value)
    await attendance.save()
    return attendance

async def delete_attendance(attendance: Attendance) -> None:
    await attendance.delete()


# ─── NEW BULK ENDPOINTS ─────────────────────────────────────────────

async def get_class_overview() -> list[dict]:
    """Return per-class attendance summary for today and the current month."""
    today = date_type.today()
    first_of_month = today.replace(day=1)

    all_classes = await ClassModel.find_all().to_list()
    all_students = await Student.find_all().to_list()

    # Pre-fetch all attendance for this month across all classes in one query
    month_records = await Attendance.find(
        Attendance.date >= first_of_month,
        Attendance.date <= today,
    ).to_list()

    results = []
    for cls in all_classes:
        cls_students = [s for s in all_students if s.class_id == cls.id]
        total_students = len(cls_students)
        student_ids = {s.id for s in cls_students}

        cls_records = [r for r in month_records if r.class_id == cls.id and r.student_id in student_ids]
        today_records = [r for r in cls_records if r.date == today]

        present_today = sum(1 for r in today_records if r.status.lower() == "present") + sum(0.5 for r in today_records if r.status.lower() == "half day")
        holidays_today = sum(1 for r in today_records if r.status.lower() == "holiday")
        is_holiday_today = holidays_today > 0 and holidays_today >= total_students

        # Count distinct working days (days where at least one non-holiday record exists)
        working_days = len(set(
            r.date for r in cls_records if r.status.lower() in ("present", "absent", "half day")
        ))

        # Monthly stats
        month_present = sum(1 for r in cls_records if r.status.lower() == "present") + sum(0.5 for r in cls_records if r.status.lower() == "half day")
        month_total = sum(1 for r in cls_records if r.status.lower() in ("present", "absent", "half day"))
        expected_total = working_days * total_students
        month_pct = round((month_present / expected_total) * 100) if expected_total > 0 else 0

        results.append({
            "class_id": cls.id,
            "class_name": f"{cls.name} {cls.section}",
            "total_students": total_students,
            "present_today": present_today,
            "marked_today": len(today_records),
            "is_holiday_today": is_holiday_today,
            "month_present": month_present,
            "month_total": month_total,
            "month_pct": month_pct,
            "working_days": working_days,
        })

    return results


async def mark_holiday(class_id: int, target_date: date_type) -> int:
    """Mark every student in a class as 'holiday' for the given date."""
    class_model = await ClassModel.get(class_id)
    if not class_model:
        raise ValueError("Class not found")

    cls_students = await Student.find(Student.class_id == class_id).to_list()
    if not cls_students:
        raise ValueError("No students in this class")

    count = 0
    for student in cls_students:
        existing = await Attendance.find_one(
            Attendance.student_id == student.id,
            Attendance.date == target_date,
        )
        if existing:
            existing.status = "holiday"
            existing.remarks = "Holiday"
            await existing.save()
        else:
            att = Attendance(
                student_id=student.id,
                class_id=class_id,
                date=target_date,
                status="holiday",
                remarks="Holiday",
            )
            await att.insert()
        count += 1
    return count


async def mark_all(class_id: int, target_date: date_type, status: str) -> int:
    """Bulk mark all students in a class for the given date with the given status."""
    class_model = await ClassModel.get(class_id)
    if not class_model:
        raise ValueError("Class not found")

    cls_students = await Student.find(Student.class_id == class_id).to_list()
    if not cls_students:
        raise ValueError("No students in this class")

    count = 0
    for student in cls_students:
        existing = await Attendance.find_one(
            Attendance.student_id == student.id,
            Attendance.date == target_date,
        )
        if existing:
            existing.status = status
            await existing.save()
        else:
            att = Attendance(
                student_id=student.id,
                class_id=class_id,
                date=target_date,
                status=status,
                remarks="",
            )
            await att.insert()
        count += 1
    return count
