from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.models.user import User
from app.api.deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=List[User])
async def get_users(current_admin: User = Depends(get_current_admin)):
    """Get all active users"""
    db = get_database()
    users = await db.users.find({"status": "active"}).to_list(100)
    
    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("hashed_password", None)
    
    return users

@router.get("/pending", response_model=List[User])
async def get_pending_users(current_admin: User = Depends(get_current_admin)):
    """Get all pending users"""
    db = get_database()
    users = await db.users.find({"status": "pending"}).to_list(100)
    
    for user in users:
        user["_id"] = str(user["_id"])
        user.pop("hashed_password", None)
    
    return users

@router.put("/{user_id}/approve", response_model=User)
async def approve_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Approve a pending user"""
    db = get_database()
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": "active", "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user["_id"] = str(user["_id"])
    user.pop("hashed_password", None)
    
    return User(**user)

@router.put("/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str,
    custom_role_id: str = None,
    current_admin: User = Depends(get_current_admin)
):
    """Update user role"""
    db = get_database()
    
    update_data = {"role": role, "updated_at": datetime.utcnow()}
    if custom_role_id:
        update_data["custom_role"] = custom_role_id
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User role updated successfully"}

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete a user"""
    db = get_database()
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User deleted successfully"}
