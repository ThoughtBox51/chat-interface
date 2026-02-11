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
def get_models(current_user: User = Depends(get_current_user)):
    """Get all active models"""
    db = get_dynamodb()
    table = db.get_table(settings.MODELS_TABLE)
    
    # Scan for active models
    response = table.scan(
        FilterExpression='is_active = :active',
        ExpressionAttributeValues={':active': True}
    )
    
    models = [decimal_to_float(item) for item in response.get('Items', [])]
    
    # Remove sensitive data
    for model in models:
        model.pop('api_key', None)
    
    return models

@router.post("/", response_model=Model, status_code=status.HTTP_201_CREATED)
def create_model(
    model_data: ModelCreate,
    current_admin: User = Depends(get_current_admin)
):
    """Create a new model"""
    db = get_dynamodb()
    table = db.get_table(settings.MODELS_TABLE)
    
    model_dict = model_data.model_dump()
    
    # Convert headers to list of dicts if present
    if 'headers' in model_dict and model_dict['headers']:
        model_dict['headers'] = [
            {'key': h['key'], 'value': h['value'], 'secure': h.get('secure', False)}
            for h in model_dict['headers']
        ]
    
    model_dict['id'] = str(uuid.uuid4())
    model_dict['created_by'] = current_admin.id
    model_dict['created_at'] = datetime.utcnow().isoformat()
    model_dict['updated_at'] = datetime.utcnow().isoformat()
    
    table.put_item(Item=model_dict)
    
    # Remove sensitive data before returning
    model_dict.pop('api_key', None)
    
    return Model(**model_dict)

@router.post("/{model_id}/test/")
def test_model(
    model_id: str,
    current_user: User = Depends(get_current_user)
):
    """Test model connection"""
    import requests
    
    db = get_dynamodb()
    table = db.get_table(settings.MODELS_TABLE)
    
    response = table.get_item(Key={'id': model_id})
    
    if 'Item' not in response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    model = decimal_to_float(response['Item'])
    
    # Implement actual model testing logic
    try:
        # Determine endpoint based on integration type
        if model.get('integration_type') == 'easy':
            # For easy integration, use provider-specific endpoints
            provider = model.get('provider', '').lower()
            if provider == 'openai':
                endpoint = 'https://api.openai.com/v1/chat/completions'
            elif provider == 'anthropic':
                endpoint = 'https://api.anthropic.com/v1/messages'
            else:
                endpoint = model.get('endpoint', 'https://api.openai.com/v1/chat/completions')
        else:
            # For custom integration, use the configured endpoint
            endpoint = model.get('endpoint')
            if not endpoint:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Model endpoint not configured"
                )
        
        # Build headers
        headers = {
            'Content-Type': 'application/json'
        }
        
        # Add API key if present
        if model.get('api_key'):
            headers['Authorization'] = f"Bearer {model['api_key']}"
        
        # Add custom headers
        for header in model.get('headers', []):
            headers[header['key']] = header['value']
        
        # Make test request
        test_payload = {
            'model': model['name'],
            'messages': [{'role': 'user', 'content': 'test'}],
            'max_tokens': 5
        }
        
        api_response = requests.post(
            endpoint,
            headers=headers,
            json=test_payload,
            timeout=10
        )
        
        if api_response.status_code == 200:
            return {
                "success": True,
                "message": "Model connection successful",
                "response": {
                    "status": "ok",
                    "model": model["name"],
                    "provider": model.get("provider", "custom"),
                    "status_code": api_response.status_code
                }
            }
        else:
            return {
                "success": False,
                "message": f"Model connection failed: {api_response.status_code}",
                "response": {
                    "status": "error",
                    "status_code": api_response.status_code,
                    "error": api_response.text[:200]
                }
            }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "message": "Connection timeout",
            "response": {"status": "error", "error": "Request timed out"}
        }
    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}",
            "response": {"status": "error", "error": str(e)}
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Test failed: {str(e)}",
            "response": {"status": "error", "error": str(e)}
        }

@router.put("/{model_id}/", response_model=Model)
def update_model(
    model_id: str,
    model_data: ModelUpdate,
    current_admin: User = Depends(get_current_admin)
):
    """Update a model"""
    db = get_dynamodb()
    table = db.get_table(settings.MODELS_TABLE)
    
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
        response = table.update_item(
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

@router.delete("/{model_id}/")
def delete_model(
    model_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete a model"""
    print(f"Delete request for model_id: {model_id}")
    db = get_dynamodb()
    table = db.get_table(settings.MODELS_TABLE)
    
    # First check if model exists
    response = table.get_item(Key={'id': model_id})
    print(f"Get item response: {response}")
    
    if 'Item' not in response:
        print(f"Model not found: {model_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    # Delete the model
    table.delete_item(Key={'id': model_id})
    print(f"Model deleted successfully: {model_id}")
    return {"message": "Model deleted successfully"}
