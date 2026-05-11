import asyncio
from app.database.session import init_db
from app.models.admin_user import AdminUser
from app.schemas.admin_user import AdminUserCreate
from app.services.admin_user_service import create_admin_user

async def create_teacher():
    await init_db()
    
    teacher = await AdminUser.find_one({"username": "teacher"})
    if not teacher:
        print("Creating default teacher account...")
        new_teacher = AdminUserCreate(
            username="teacher",
            email="teacher@schoolsync.com",
            password="teacher123",
            role="teacher",
            staff_id=None
        )
        try:
            await create_admin_user(new_teacher)
            print("Teacher account created successfully!")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Teacher account already exists.")
        
    print("Username: teacher")
    print("Password: teacher123")

if __name__ == "__main__":
    asyncio.run(create_teacher())
