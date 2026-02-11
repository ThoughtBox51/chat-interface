from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from decimal import Decimal
import boto3
from functools import lru_cache

from app.core.security import decode_token
from app.core.config import settings
from app.models.user import User

security = HTTPBearer()

def decimal_to_float(obj):
    """Convert DynamoDB Decimal to float"""
    if isinstance(obj, list):
        return [decimal_to_float(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj

@lru_cache()
def get_boto_session():
    """Get boto3 session (cached)"""
    print(f"Creating boto3 session with profile: {settings.AWS_PROFILE}")
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

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    table = get_dynamodb_table(settings.USERS_TABLE)
    response = table.get_item(Key={'id': user_id})
    
    if 'Item' not in response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_data = decimal_to_float(response['Item'])
    
    if user_data.get("status") != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active"
        )
    
    return User(**user_data)

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
