from typing import Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ModelPermission(BaseModel):
    view: bool = False
    use: bool = False
    configure: bool = False

class FeaturePermissions(BaseModel):
    chat: bool = False
    history: bool = False
    export: bool = False
    share: bool = False
    settings: bool = False
    profile: bool = False
    user_chat: bool = False  # Permission to chat with other users

class AdminPermissions(BaseModel):
    manage_users: bool = False
    manage_models: bool = False
    manage_roles: bool = False
    view_analytics: bool = False
    system_settings: bool = False

class Permissions(BaseModel):
    models: Dict[str, ModelPermission] = {}
    features: FeaturePermissions = FeaturePermissions()
    admin: AdminPermissions = AdminPermissions()

class RoleBase(BaseModel):
    name: str
    description: str
    permissions: Permissions
    max_chats: Optional[int] = None  # None means unlimited
    max_tokens_per_month: Optional[int] = None  # None means unlimited
    context_length: Optional[int] = 4096  # Default context length

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permissions: Optional[Permissions] = None
    max_chats: Optional[int] = None
    max_tokens_per_month: Optional[int] = None
    context_length: Optional[int] = None

class RoleInDB(RoleBase):
    id: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class Role(RoleInDB):
    pass
