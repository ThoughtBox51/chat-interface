from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    name: str
    bio: Optional[str] = ""
    role: str = "user"
    custom_role: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None

class UserInDB(UserBase):
    id: str
    hashed_password: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    tokens_used_this_month: int = 0
    token_usage_reset_date: Optional[datetime] = None

class User(UserBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
