"""
Fix existing student DOBs to comply with grade-based age constraints.

Grade | Min Age | Max Age
  1   |   5     |   7
  2   |   6     |   8
  3   |   7     |   9
  4   |   8     |  10
  5   |   9     |  11
  6   |  10     |  12
  7   |  11     |  13
  8   |  12     |  14
  9   |  13     |  15
 10   |  14     |  16

For each student:
  - Extract grade number from their class name
  - Calculate their age from current DOB
  - If age is outside the allowed range, generate a new DOB
    that places them at the midpoint of the valid age range
"""

import asyncio
import re
from datetime import date, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "school_management")

GRADE_AGE_LIMITS = {
    1: (5, 7),
    2: (6, 8),
    3: (7, 9),
    4: (8, 10),
    5: (9, 11),
    6: (10, 12),
    7: (11, 13),
    8: (12, 14),
    9: (13, 15),
    10: (14, 16),
}


def extract_grade(class_name: str) -> int | None:
    match = re.search(r"(\d+)", class_name or "")
    if match:
        num = int(match.group(1))
        if 1 <= num <= 10:
            return num
    return None


def calculate_age(dob: date) -> int:
    today = date.today()
    age = today.year - dob.year
    if (today.month, today.day) < (dob.month, dob.day):
        age -= 1
    return age


def generate_valid_dob(grade: int) -> date:
    """Generate a DOB that places the student at the midpoint age for their grade."""
    min_age, max_age = GRADE_AGE_LIMITS[grade]
    target_age = (min_age + max_age) // 2
    today = date.today()
    # Set DOB to roughly target_age years ago (use June 15 as a neutral birthday)
    return date(today.year - target_age, 6, 15)


async def fix_dobs():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]

    # Build class_id -> class_name map
    classes = await db.classes.find().to_list(length=1000)
    class_map = {}
    for c in classes:
        cid = c.get("id") or c.get("_id")
        class_map[cid] = c.get("name", "")

    students = await db.students.find().to_list(length=10000)
    fixed = 0
    skipped = 0

    for student in students:
        sid = student.get("_id")
        class_id = student.get("class_id")
        class_name = class_map.get(class_id, "")
        grade = extract_grade(class_name)

        if not grade or grade not in GRADE_AGE_LIMITS:
            skipped += 1
            continue

        dob_raw = student.get("dob") or student.get("date_of_birth")
        if not dob_raw:
            # No DOB set — generate one
            new_dob = generate_valid_dob(grade)
            await db.students.update_one(
                {"_id": sid},
                {"$set": {"dob": new_dob.isoformat(), "date_of_birth": new_dob.isoformat()}}
            )
            print(f"  [SET] Student {sid} (Grade {grade}): no DOB -> {new_dob.isoformat()}")
            fixed += 1
            continue

        # Parse DOB
        if isinstance(dob_raw, str):
            try:
                dob = date.fromisoformat(dob_raw[:10])
            except ValueError:
                print(f"  [SKIP] Student {sid}: invalid DOB format '{dob_raw}'")
                skipped += 1
                continue
        elif hasattr(dob_raw, "date"):
            dob = dob_raw.date()
        else:
            skipped += 1
            continue

        age = calculate_age(dob)
        min_age, max_age = GRADE_AGE_LIMITS[grade]

        if min_age <= age <= max_age:
            # Already valid
            continue

        # Generate a new valid DOB
        new_dob = generate_valid_dob(grade)
        await db.students.update_one(
            {"_id": sid},
            {"$set": {"dob": new_dob.isoformat(), "date_of_birth": new_dob.isoformat()}}
        )
        name = f"{student.get('first_name', '')} {student.get('last_name', '')}"
        print(f"  [FIX] {name} (Grade {grade}): age {age} -> DOB {new_dob.isoformat()} (age ~{calculate_age(new_dob)})")
        fixed += 1

    print(f"\nDone! Fixed: {fixed}, Skipped: {skipped}, Total: {len(students)}")
    client.close()


if __name__ == "__main__":
    asyncio.run(fix_dobs())
