from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.core.security import create_access_token
from app.models.admin_user import AdminUser
from app.schemas.admin_user import AdminUserCreate, AdminUserRead, Token
from app.services.admin_user_service import (
    authenticate_user,
    create_admin_user,
    get_user_by_email,
    get_user_by_username,
    update_last_login,
)

router = APIRouter()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    await update_last_login(user)
    access_token = create_access_token(subject=str(user.id))
    return Token(access_token=access_token, token_type="bearer")


@router.post("/register", response_model=AdminUserRead)
async def register_admin(
    admin_in: AdminUserCreate,
    current_user: AdminUser = Depends(require_roles(["superadmin", "admin"])),
) -> AdminUserRead:
    if admin_in.role == "superadmin" and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only superadmins can create other superadmins")
    if await get_user_by_username(admin_in.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    if await get_user_by_email(admin_in.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
    return await create_admin_user(admin_in)


@router.get("/me", response_model=AdminUserRead)
async def read_me(current_user: AdminUser = Depends(get_current_user)) -> AdminUserRead:
    return current_user


@router.get("/users", response_model=list[AdminUserRead])
async def list_users(
    _=Depends(require_roles(["admin", "superadmin"])),
):
    return await AdminUser.find_all().to_list()


from pydantic import BaseModel

class RoleUpdateBody(BaseModel):
    role: str

@router.patch("/users/{user_id}/role", response_model=AdminUserRead)
async def update_user_role(
    user_id: int,
    body: RoleUpdateBody,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
):
    if body.role == "superadmin" and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only superadmins can grant superadmin privileges")

    user = await AdminUser.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == "superadmin" and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot modify a superadmin's role")

    if body.role not in ("admin", "superadmin", "teacher"):
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = body.role
    await user.save()
    return user


@router.patch("/users/{user_id}/toggle-active", response_model=AdminUserRead)
async def toggle_user_active(
    user_id: int,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
):
    user = await AdminUser.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == "superadmin" and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot deactivate a superadmin")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")

    user.is_active = not user.is_active
    await user.save()
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    current_user: AdminUser = Depends(require_roles(["admin", "superadmin"])),
):
    user = await AdminUser.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.role == "superadmin" and current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot delete a superadmin")
        
    if user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account")

    await user.delete()
    return None
