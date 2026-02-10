from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.models.role import RoleCreate, RoleUpdate, Role
from app.models.user import User
from app.api.deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=List[Role])
async def get_roles(current_admin: User = Depends(get_current_admin)):
    """Get all roles"""
    db = get_database()
    roles = await db.roles.find().to_list(100)
    
    for role in roles:
        role["_id"] = str(role["_id"])
    
    return roles

@router.post("/", response_model=Role, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_admin: User = Depends(get_current_admin)
):
    """Create a new role"""
    db = get_database()
    
    # Check if role name already exists
    existing = await db.roles.find_one({"name": role_data.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists"
        )
    
    role_dict = role_data.model_dump()
    role_dict["created_by"] = current_admin.id
    role_dict["created_at"] = datetime.utcnow()
    role_dict["updated_at"] = datetime.utcnow()
    
    result = await db.roles.insert_one(role_dict)
    
    created_role = await db.roles.find_one({"_id": result.inserted_id})
    created_role["_id"] = str(created_role["_id"])
    
    return Role(**created_role)

@router.put("/{role_id}", response_model=Role)
async def update_role(
    role_id: str,
    role_data: RoleUpdate,
    current_admin: User = Depends(get_current_admin)
):
    """Update a role"""
    db = get_database()
    
    update_dict = {k: v for k, v in role_data.model_dump().items() if v is not None}
    if update_dict:
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await db.roles.update_one(
            {"_id": ObjectId(role_id)},
            {"$set": update_dict}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
    
    updated_role = await db.roles.find_one({"_id": ObjectId(role_id)})
    updated_role["_id"] = str(updated_role["_id"])
    
    return Role(**updated_role)

@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete a role"""
    db = get_database()
    
    result = await db.roles.delete_one({"_id": ObjectId(role_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    
    return {"message": "Role deleted successfully"}
