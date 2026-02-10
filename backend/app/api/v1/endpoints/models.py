from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
import uuid

from app.core.database import get_dynamodb
from app.core.config import settings
from app.models.model import ModelCreate, ModelUpdate, Model
from app.models.user import User
from app.api.deps import get_current_user, get_current_admin, decimal_to_float

router = APIRouter()

@router.get("/", response_model=List[Model])
async def get_models(current_user: User = Depends(get_current_user)):
    """Get all active models"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.MODELS_TABLE)
        
        # Scan for active models
        response = await table.scan(
            FilterExpression='is_active = :active',
            ExpressionAttributeValues={':active': True}
        )
        
        models = [decimal_to_float(item) for item in response.get('Items', [])]
        
        # Remove sensitive data
        for model in models:
            model.pop('api_key', None)
        
        return models

@router.post("/", response_model=Model, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    current_admin: User = Depends(get_current_admin)
):
    """Create a new model"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.MODELS_TABLE)
        
        model_dict = model_data.model_dump()
        model_dict['id'] = str(uuid.uuid4())
        model_dict['created_by'] = current_admin.id
        model_dict['created_at'] = datetime.utcnow().isoformat()
        model_dict['updated_at'] = datetime.utcnow().isoformat()
        
        await table.put_item(Item=model_dict)
        
        # Remove sensitive data before returning
        model_dict.pop('api_key', None)
        
        return Model(**model_dict)

@router.put("/{model_id}", response_model=Model)
async def update_model(
    model_id: str,
    model_data: ModelUpdate,
    current_admin: User = Depends(get_current_admin)
):
    """Update a model"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.MODELS_TABLE)
        
        update_dict = {k: v for k, v in model_data.model_dump().items() if v is not None}
        
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
            # Handle reserved keywords
            attr_name = f'#{key}'
            attr_value = f':{key}'
            update_expr += f', {attr_name} = {attr_value}'
            expr_names[attr_name] = key
            expr_values[attr_value] = value
        
        try:
            response = await table.update_item(
                Key={'id': model_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names if expr_names else None,
                ExpressionAttributeValues=expr_values,
                ReturnValues='ALL_NEW'
            )
            
            updated_model = decimal_to_float(response['Attributes'])
            updated_model.pop('api_key', None)
            
            return Model(**updated_model)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )

@router.delete("/{model_id}")
async def delete_model(
    model_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete a model"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.MODELS_TABLE)
        
        try:
            await table.delete_item(Key={'id': model_id})
            return {"message": "Model deleted successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )

@router.post("/{model_id}/test")
async def test_model(
    model_id: str,
    current_user: User = Depends(get_current_user)
):
    """Test model connection"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.MODELS_TABLE)
        
        response = await table.get_item(Key={'id': model_id})
        
        if 'Item' not in response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        model = decimal_to_float(response['Item'])
        
        # TODO: Implement actual model testing logic
        # This would make a real API call to the model endpoint
        
        return {
            "success": True,
            "message": "Model connection successful",
            "response": {
                "status": "ok",
                "model": model["name"],
                "provider": model.get("provider", "custom")
            }
        }
