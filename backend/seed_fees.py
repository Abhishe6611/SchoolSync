"""
Seed script: Drop all fee/payment data and create new fees
based on the Grade 1-10 fee structure.

Run:  python -m seed_fees
"""

import asyncio
import re
from datetime import date

from app.database.session import init_db
from app.models.fee import Fee
from app.models.payment import Payment
from app.models.student import Student
from app.models.class_model import ClassModel


# ── Fee Structure (Annual) ─────────────────────────────────
GRADE_FEES = {
    1:  {"tuition": 40000, "admission": 5000, "exam_activity": 3000},
    2:  {"tuition": 42000, "admission": 5000, "exam_activity": 3500},
    3:  {"tuition": 44000, "admission": 5000, "exam_activity": 4000},
    4:  {"tuition": 46000, "admission": 5000, "exam_activity": 4000},
    5:  {"tuition": 48000, "admission": 5000, "exam_activity": 4500},
    6:  {"tuition": 52000, "admission": 5000, "exam_activity": 5000},
    7:  {"tuition": 56000, "admission": 5000, "exam_activity": 5500},
    8:  {"tuition": 60000, "admission": 5000, "exam_activity": 6000},
    9:  {"tuition": 65000, "admission": 5000, "exam_activity": 6500},
    10: {"tuition": 70000, "admission": 5000, "exam_activity": 7000},
}


def extract_grade_number(class_name: str) -> int | None:
    """Extract grade number from class name like 'Grade 1', 'Class 5', '10', etc."""
    match = re.search(r'(\d+)', class_name)
    if match:
        num = int(match.group(1))
        if 1 <= num <= 10:
            return num
    return None


async def main():
    await init_db()

    # ── Step 1: Drop all existing Fee and Payment records ──
    print("Dropping all Payment records...")
    payment_count = await Payment.find_all().count()
    if payment_count > 0:
        await Payment.find_all().delete()
    print(f"   Deleted {payment_count} payment records.")

    print("Dropping all Fee records...")
    fee_count = await Fee.find_all().count()
    if fee_count > 0:
        await Fee.find_all().delete()
    print(f"   Deleted {fee_count} fee records.")

    # ── Step 1.5: Migrate existing students ────────────────
    # Old student records might be missing the new mandatory fields.
    print("\nMigrating existing student records to ensure they have the new mandatory fields...")
    await Student.find_all().update({
        "$set": {
            "religion": "Not Specified",
            "blood_group": "Unknown",
            "nationality": "Indian",
            "father_name": "Not Specified",
            "mother_name": "Not Specified",
            "parent_contact": "0000000000",
            "parent_occupation": "Not Specified",
        }
    })

    # ── Step 2: Load classes and students ───────────────────
    classes = await ClassModel.find_all().to_list()
    students = await Student.find_all().to_list()

    class_map = {c.id: c.name for c in classes}
    print(f"\nFound {len(classes)} classes and {len(students)} students.")
    print(f"   Classes: {[f'{c.name} {c.section} (ID:{c.id})' for c in classes]}\n")

    # ── Step 3: Create Fee records per student ─────────────
    created = 0
    skipped = 0
    today = date.today()
    academic_year_end = date(today.year if today.month >= 4 else today.year, 3, 31)
    if today.month >= 4:
        academic_year_end = date(today.year + 1, 3, 31)

    for student in students:
        class_name = class_map.get(student.class_id, "")
        grade = extract_grade_number(class_name)

        if grade is None or grade not in GRADE_FEES:
            print(f"   [SKIPPED] Student #{student.id} ({student.first_name} {student.last_name}) — class '{class_name}' doesn't match Grade 1-10")
            skipped += 1
            continue

        fees = GRADE_FEES[grade]
        tuition = fees["tuition"]
        admission = fees["admission"]
        exam_activity = fees["exam_activity"]
        total_annual = tuition + admission + exam_activity

        # Include transport fee from student record if assigned
        transport_fee = student.transport_fee if student.transport_fee else 0

        grand_total = total_annual + transport_fee

        # Create the Fee record
        fee = Fee(
            student_id=student.id,
            amount=grand_total,
            paid_amount=0,
            due_date=academic_year_end,
            status="pending",
        )
        await fee.insert()

        # Update the student's fee breakdown fields
        student.base_fee = tuition
        student.other_fee = admission + exam_activity
        student.total_fee = grand_total
        await student.save()

        created += 1
        print(f"   [CREATED] Student #{student.id} {student.first_name} {student.last_name} | Grade {grade} | Total: INR {grand_total:,.0f} (Tuition: INR {tuition:,} + Admission: INR {admission:,} + Exam: INR {exam_activity:,} + Transport: INR {transport_fee:,})")

    # ── Summary ────────────────────────────────────────────
    print(f"\n{'─' * 60}")
    print(f"[DONE] Created {created} fee records, skipped {skipped}.")
    print(f"   Academic year due date: {academic_year_end}")
    print(f"{'─' * 60}")


if __name__ == "__main__":
    asyncio.run(main())
