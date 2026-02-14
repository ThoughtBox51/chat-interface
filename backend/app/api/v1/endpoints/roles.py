from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
import uuid

from app.core.database import get_dynamodb
from app.core.config import settings
from app.models.role import RoleCreate, RoleUpdate, Role
from app.models.user import User
from app.api.deps import get_current_admin, get_current_user, decimal_to_float

router = APIRouter()

@router.get("/", response_model=List[Role])
async def get_roles(current_admin: User = Depends(get_current_admin)):
    """Get all roles"""
    db = get_dynamodb()
    table = db.get_table(settings.ROLES_TABLE)
    
    response = table.scan()
    roles = [decimal_to_float(item) for item in response.get('Items', [])]
    
    return roles

@router.post("/", response_model=Role, status_code=status.HTTP_201_CREATED)
async def create_role(
    role_data: RoleCreate,
    current_admin: User = Depends(get_current_admin)
):
    """Create a new role"""
    db = get_dynamodb()
    table = db.get_table(settings.ROLES_TABLE)
    
    # Check if role name already exists
    response = table.scan(
        FilterExpression='#name = :name',
        ExpressionAttributeNames={'#name': 'name'},
        ExpressionAttributeValues={':name': role_data.name}
    )
    
    if response.get('Items'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role name already exists"
        )
    
    role_dict = role_data.model_dump()
    role_dict['id'] = str(uuid.uuid4())
    role_dict['created_by'] = current_admin.id
    role_dict['created_at'] = datetime.utcnow().isoformat()
    role_dict['updated_at'] = datetime.utcnow().isoformat()
    
    table.put_item(Item=role_dict)
    
    return Role(**role_dict)

@router.put("/{role_id}/", response_model=Role)
async def update_role(
    role_id: str,
    role_data: RoleUpdate,
    current_admin: User = Depends(get_current_admin)
):
    """Update a role"""
    db = get_dynamodb()
    table = db.get_table(settings.ROLES_TABLE)
    
    # Get all fields from role_data, including None values for limits
    # (None means unlimited, so we need to preserve it)
    update_dict = role_data.model_dump(exclude_unset=True)
    
    if not update_dict:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Build update expression
    update_expr = 'SET updated_at = :updated_at'
    expr_values = {':updated_at': datetime.utcnow().isoformat()}
    expr_names = {}
    
    for key, value in update_dict.items():
        attr_name = f'#{key}'
        attr_value = f':{key}'
        update_expr += f', {attr_name} = {attr_value}'
        expr_names[attr_name] = key
        # DynamoDB doesn't support None, so use NULL for None values
        expr_values[attr_value] = value if value is not None else None
    
    try:
        response = table.update_item(
            Key={'id': role_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names if expr_names else None,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        updated_role = decimal_to_float(response['Attributes'])
        
        return Role(**updated_role)
    except Exception as e:
        print(f"Error updating role: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role not found or update failed: {str(e)}"
        )

@router.delete("/{role_id}/")
async def delete_role(
    role_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete a role"""
    db = get_dynamodb()
    table = db.get_table(settings.ROLES_TABLE)
    
    try:
        table.delete_item(Key={'id': role_id})
        return {"message": "Role deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )


@router.get("/current/limits")
async def get_current_user_limits(current_user: User = Depends(get_current_user)):
    """Get role limits for the current user"""
    if not current_user.custom_role:
        # Users without custom_role (like admins) have no limits
        return {
            "max_chats": None,
            "max_tokens_per_month": None,
            "context_length": None,  # None means unlimited/not enforced
            "tokens_used_this_month": 0
        }
    
    db = get_dynamodb()
    roles_table = db.get_table(settings.ROLES_TABLE)
    
    role_response = roles_table.get_item(Key={'id': current_user.custom_role})
    
    if 'Item' not in role_response:
        # If custom_role is set but role not found, return defaults
        return {
            "max_chats": None,
            "max_tokens_per_month": None,
            "context_length": None,
            "tokens_used_this_month": 0
        }
    
    role = decimal_to_float(role_response['Item'])
    
    return {
        "max_chats": role.get('max_chats'),
        "max_tokens_per_month": role.get('max_tokens_per_month'),
        "context_length": role.get('context_length'),  # Can be None for unlimited
        "tokens_used_this_month": getattr(current_user, 'tokens_used_this_month', 0)
    }
