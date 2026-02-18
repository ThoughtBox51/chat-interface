from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
import uuid

from app.core.database import get_dynamodb
from app.core.config import settings
from app.models.user import User
from app.api.deps import get_current_admin, get_current_user, decimal_to_float

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
    
    # Always update custom_role (set to null if not provided)
    if custom_role_id:
        update_expr += ', custom_role = :custom_role'
        expr_values[':custom_role'] = custom_role_id
    else:
        # Remove custom_role attribute if setting to admin
        update_expr += ' REMOVE custom_role'
    
    try:
        response = table.update_item(
            Key={'id': user_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        return {"message": "User role updated successfully", "user": response.get('Attributes')}
    except Exception as e:
        print(f"Error updating user role: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User not found or update failed: {str(e)}"
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


@router.post("/{user_id}/tokens/")
async def track_token_usage(
    user_id: str,
    token_data: dict,
    current_admin: User = Depends(get_current_admin)
):
    """Track token usage for a user"""
    db = get_dynamodb()
    users_table = db.get_table(settings.USERS_TABLE)
    
    tokens_used = token_data.get('tokens_used', 0)
    
    if tokens_used <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid token count"
        )
    
    # Get user to check role limits
    user_response = users_table.get_item(Key={'id': user_id})
    
    if 'Item' not in user_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user = decimal_to_float(user_response['Item'])
    current_tokens = user.get('tokens_used_this_month', 0)
    
    # Check if we need to reset monthly counter
    from datetime import datetime
    reset_date = user.get('token_usage_reset_date')
    now = datetime.utcnow()
    
    if not reset_date or datetime.fromisoformat(reset_date).month != now.month:
        # Reset counter for new month
        current_tokens = 0
        reset_date = now.isoformat()
    
    new_token_count = current_tokens + tokens_used
    
    # Check role limits if user has custom role
    if user.get('custom_role'):
        roles_table = db.get_table(settings.ROLES_TABLE)
        role_response = roles_table.get_item(Key={'id': user['custom_role']})
        
        if 'Item' in role_response:
            role = decimal_to_float(role_response['Item'])
            max_tokens = role.get('max_tokens_per_month')
            
            if max_tokens is not None and new_token_count > max_tokens:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Monthly token limit exceeded. Limit: {max_tokens}, Used: {new_token_count}"
                )
    
    # Update user token usage
    users_table.update_item(
        Key={'id': user_id},
        UpdateExpression='SET tokens_used_this_month = :tokens, token_usage_reset_date = :reset_date',
        ExpressionAttributeValues={
            ':tokens': new_token_count,
            ':reset_date': reset_date
        }
    )
    
    return {
        "message": "Token usage tracked successfully",
        "tokens_used_this_month": new_token_count
    }


@router.get("/search/", response_model=List[User])
async def search_users(
    query: str,
    current_user: User = Depends(get_current_user)
):
    """Search users by name or email"""
    if not query or len(query) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters"
        )
    
    db = get_dynamodb()
    table = db.get_table(settings.USERS_TABLE)
    
    # Query active users using status-index
    response = table.query(
        IndexName='status-index',
        KeyConditionExpression='#status = :status',
        ExpressionAttributeNames={'#status': 'status'},
        ExpressionAttributeValues={':status': 'active'}
    )
    
    users = [decimal_to_float(item) for item in response.get('Items', [])]
    
    # Filter by search query (case-insensitive)
    query_lower = query.lower()
    filtered_users = [
        user for user in users
        if (query_lower in user.get('name', '').lower() or 
            query_lower in user.get('email', '').lower()) and
            user.get('id') != current_user.id  # Exclude current user
    ]
    
    # Remove sensitive data
    for user in filtered_users:
        user.pop('hashed_password', None)
    
    return filtered_users[:10]  # Limit to 10 results
