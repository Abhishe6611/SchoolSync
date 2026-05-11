import asyncio
import os

from app.core.security import get_password_hash
from app.database.session import init_db
from app.models.admin_user import AdminUser

async def seed_superadmin() -> None:
    await init_db()
    
    username = os.getenv("SEED_ADMIN_USERNAME", "superadmin")
    email = os.getenv("SEED_ADMIN_EMAIL", "superadmin@example.com")
    password = os.getenv("SEED_ADMIN_PASSWORD", "ChangeMe123!")

    existing = await AdminUser.find_one({"username": username})
    if existing:
        print("Superadmin already exists")
        return
        
    user = AdminUser(
        username=username,
        email=email,
        hashed_password=get_password_hash(password),
        role="superadmin",
        is_active=True,
    )
    await user.insert()
    print("Superadmin created")


if __name__ == "__main__":
    asyncio.run(seed_superadmin())
