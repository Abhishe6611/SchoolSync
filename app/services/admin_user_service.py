from datetime import datetime, timezone

from app.core.security import get_password_hash, verify_password
from app.models.admin_user import AdminUser
from app.schemas.admin_user import AdminUserCreate

async def get_user_by_username(username: str) -> AdminUser | None:
    return await AdminUser.find_one({"username": username})

async def get_user_by_email(email: str) -> AdminUser | None:
    return await AdminUser.find_one({"email": email})

async def create_admin_user(admin_in: AdminUserCreate) -> AdminUser:
    db_user = AdminUser(
        username=admin_in.username,
        email=admin_in.email,
        hashed_password=get_password_hash(admin_in.password),
        role=admin_in.role,
        staff_id=admin_in.staff_id,
        is_active=True,
    )
    await db_user.insert()
    return db_user

async def authenticate_user(username: str, password: str) -> AdminUser | None:
    user = await get_user_by_username(username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

async def update_last_login(user: AdminUser) -> AdminUser:
    user.last_login = datetime.now(timezone.utc)
    await user.save()
    return user
