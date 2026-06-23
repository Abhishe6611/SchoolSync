import asyncio
from datetime import date
from app.database.session import init_db
from app.models.admin_user import AdminUser
from app.models.staff import Staff
from app.models.class_model import ClassModel

async def setup_data():
    await init_db()
    
    # 1. Create a Staff member
    staff_member = await Staff.find_one({"first_name": "Sarah", "last_name": "Connor"})
    if not staff_member:
        staff_member = Staff(
            first_name="Sarah",
            last_name="Connor",
            role="Teacher",
            email="sarah@schoolsync.com",
            hire_date=date.today()
        )
        await staff_member.insert()
        print(f"Created Staff: {staff_member.id}")
    else:
        print(f"Staff already exists: {staff_member.id}")

    # 2. Update Teacher User with staff_id
    teacher_user = await AdminUser.find_one({"username": "teacher"})
    if teacher_user:
        teacher_user.staff_id = staff_member.id
        await teacher_user.save()
        print("Linked staff_id to teacher user.")

    # 3. Create a Class and assign as advisor
    cls = await ClassModel.find_one({"name": "10", "section": "A"})
    if not cls:
        cls = ClassModel(
            name="10",
            section="A",
            year="2023-2024",
            advisor_id=staff_member.id
        )
        await cls.insert()
        print(f"Created Class 10A with advisor: {staff_member.id}")
    else:
        cls.advisor_id = staff_member.id
        await cls.save()
        print(f"Updated Class 10A advisor to: {staff_member.id}")

if __name__ == "__main__":
    asyncio.run(setup_data())
