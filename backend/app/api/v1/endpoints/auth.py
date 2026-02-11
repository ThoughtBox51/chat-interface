from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime
import uuid
import boto3
from functools import lru_cache

from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import UserCreate, User
from app.api.deps import get_current_user, decimal_to_float

router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
    password: str

@lru_cache()
def get_boto_session():
    """Get boto3 session (cached)"""
    if settings.AWS_PROFILE:
        return boto3.Session(profile_name=settings.AWS_PROFILE)
    return boto3.Session()

def get_dynamodb_table(table_name: str):
    """Get DynamoDB table resource"""
    session = get_boto_session()
    
    dynamodb_kwargs = {'region_name': settings.AWS_REGION}
    if settings.DYNAMODB_ENDPOINT_URL:
        dynamodb_kwargs['endpoint_url'] = settings.DYNAMODB_ENDPOINT_URL
    
    dynamodb = session.resource('dynamodb', **dynamodb_kwargs)
    return dynamodb.Table(table_name)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user (requires admin approval)"""
    table = get_dynamodb_table(settings.USERS_TABLE)
    
    # Check if user exists
    response = table.query(
        IndexName='email-index',
        KeyConditionExpression='email = :email',
        ExpressionAttributeValues={':email': user_data.email}
    )
    
    if response['Items']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user_id = str(uuid.uuid4())
    user_dict = {
        'id': user_id,
        'email': user_data.email,
        'name': user_data.name,
        'hashed_password': get_password_hash(user_data.password),
        'bio': user_data.bio,
        'role': user_data.role,
        'status': 'pending',
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }
    
    table.put_item(Item=user_dict)
    
    return {
        "message": "Registration successful. Awaiting admin approval.",
        "user_id": user_id
    }

@router.post("/login", response_model=dict)
async def login(login_data: LoginRequest):
    """Login and get access token"""
    table = get_dynamodb_table(settings.USERS_TABLE)
    
    # Find user by email
    response = table.query(
        IndexName='email-index',
        KeyConditionExpression='email = :email',
        ExpressionAttributeValues={':email': login_data.email}
    )
    
    if not response['Items']:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    user = decimal_to_float(response['Items'][0])
    
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
    
    access_token = create_access_token(data={"sub": user["id"]})
    
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
    table = get_dynamodb_table(settings.USERS_TABLE)
    
    update_expr = "SET updated_at = :updated_at"
    expr_values = {':updated_at': datetime.utcnow().isoformat()}
    
    if name:
        update_expr += ", #n = :name"
        expr_values[':name'] = name
    if bio is not None:
        update_expr += ", bio = :bio"
        expr_values[':bio'] = bio
    
    expr_names = {'#n': 'name'} if name else None
    
    table.update_item(
        Key={'id': current_user.id},
        UpdateExpression=update_expr,
        ExpressionAttributeValues=expr_values,
        ExpressionAttributeNames=expr_names
    )
    
    # Get updated user
    response = table.get_item(Key={'id': current_user.id})
    updated_user = decimal_to_float(response['Item'])
    updated_user.pop('hashed_password', None)
    
    return User(**updated_user)
