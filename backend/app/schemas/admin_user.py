from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminUserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    role: str = Field(..., min_length=3, max_length=20)
    staff_id: Optional[int] = None


class AdminUserCreate(AdminUserBase):
    password: str = Field(..., min_length=8, max_length=128)


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, min_length=3, max_length=20)
    is_active: Optional[bool] = None


class AdminUserRead(AdminUserBase):
    id: int
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str
