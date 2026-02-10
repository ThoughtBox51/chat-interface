from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import UserCreate, User
from app.api.deps import get_current_user

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user (requires admin approval)"""
    db = get_database()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_dict = user_data.model_dump()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    user_dict["status"] = "pending"
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()
    
    result = await db.users.insert_one(user_dict)
    
    return {
        "message": "Registration successful. Awaiting admin approval.",
        "user_id": str(result.inserted_id)
    }

@router.post("/login", response_model=dict)
async def login(login_data: LoginRequest):
    """Login and get access token"""
    db = get_database()
    
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if user["status"] == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account pending approval"
        )
    
    if user["status"] == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended"
        )
    
    if not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    user["_id"] = str(user["_id"])
    user.pop("hashed_password")
    
    return {
        "token": access_token,
        "user": user
    }

@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@router.put("/profile", response_model=User)
async def update_profile(
    name: str = None,
    bio: str = None,
    current_user: User = Depends(get_current_user)
):
    """Update user profile"""
    db = get_database()
    
    update_data = {}
    if name:
        update_data["name"] = name
    if bio is not None:
        update_data["bio"] = bio
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(current_user.id)})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("hashed_password", None)
    
    return User(**updated_user)
