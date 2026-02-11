from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
import uuid

from app.core.database import get_dynamodb
from app.core.config import settings
from app.models.user import User
from app.api.deps import get_current_admin, decimal_to_float

router = APIRouter()

@router.get("/", response_model=List[User])
async def get_users(current_admin: User = Depends(get_current_admin)):
    """Get all active users"""
    db = get_dynamodb()
    table = db.get_table(settings.USERS_TABLE)
    
    # Query using status-index
    response = table.query(
        IndexName='status-index',
        KeyConditionExpression='#status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':status': 'active'}
    )
    
    users = [decimal_to_float(item) for item in response.get('Items', [])]
    
    # Remove sensitive data
    for user in users:
        user.pop('hashed_password', None)
    
    return users

@router.get("/pending/", response_model=List[User])
async def get_pending_users(current_admin: User = Depends(get_current_admin)):
    """Get all pending users"""
    db = get_dynamodb()
    table = db.get_table(settings.USERS_TABLE)
    
    # Query using status-index
    response = table.query(
        IndexName='status-index',
        KeyConditionExpression='#status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':status': 'pending'}
    )
    
    users = [decimal_to_float(item) for item in response.get('Items', [])]
    
    # Remove sensitive data
    for user in users:
        user.pop('hashed_password', None)
    
    return users

@router.put("/{user_id}/approve/", response_model=User)
async def approve_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Approve a pending user"""
    db = get_dynamodb()
    table = db.get_table(settings.USERS_TABLE)
    
    # Update user status
    try:
        response = table.update_item(
            Key={'id': user_id},
            UpdateExpression='SET #status = :status, updated_at = :updated_at',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'active',
                ':updated_at': datetime.utcnow().isoformat()
            },
            ReturnValues='ALL_NEW'
        )
        
        user_data = decimal_to_float(response['Attributes'])
        user_data.pop('hashed_password', None)
        
        return User(**user_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.put("/{user_id}/role/")
async def update_user_role(
    user_id: str,
    role_data: dict,
    current_admin: User = Depends(get_current_admin)
):
    """Update user role"""
    db = get_dynamodb()
    table = db.get_table(settings.USERS_TABLE)
    
    role = role_data.get('role')
    custom_role_id = role_data.get('customRoleId')
    
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role is required"
        )
    
    update_expr = 'SET #role = :role, updated_at = :updated_at'
    expr_names = {'#role': 'role'}
    expr_values = {
        ':role': role,
        ':updated_at': datetime.utcnow().isoformat()
    }
    
    if custom_role_id:
        update_expr += ', custom_role = :custom_role'
        expr_values[':custom_role'] = custom_role_id
    
    try:
        table.update_item(
            Key={'id': user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values
        )
        
        return {"message": "User role updated successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

@router.delete("/{user_id}/")
async def delete_user(
    user_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete a user"""
    db = get_dynamodb()
    table = db.get_table(settings.USERS_TABLE)
    
    try:
        table.delete_item(Key={'id': user_id})
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
