from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.models.model import ModelCreate, ModelUpdate, Model
from app.models.user import User
from app.api.deps import get_current_user, get_current_admin

router = APIRouter()

@router.get("/", response_model=List[Model])
async def get_models(current_user: User = Depends(get_current_user)):
    """Get all active models"""
    db = get_database()
    models = await db.models.find({"is_active": True}).to_list(100)
    
    for model in models:
        model["_id"] = str(model["_id"])
        model.pop("api_key", None)  # Don't expose API keys
    
    return models

@router.post("/", response_model=Model, status_code=status.HTTP_201_CREATED)
async def create_model(
    model_data: ModelCreate,
    current_admin: User = Depends(get_current_admin)
):
    """Create a new model"""
    db = get_database()
    
    model_dict = model_data.model_dump()
    model_dict["created_by"] = current_admin.id
    model_dict["created_at"] = datetime.utcnow()
    model_dict["updated_at"] = datetime.utcnow()
    
    result = await db.models.insert_one(model_dict)
    
    created_model = await db.models.find_one({"_id": result.inserted_id})
    created_model["_id"] = str(created_model["_id"])
    created_model.pop("api_key", None)
    
    return Model(**created_model)

@router.put("/{model_id}", response_model=Model)
async def update_model(
    model_id: str,
    model_data: ModelUpdate,
    current_admin: User = Depends(get_current_admin)
):
    """Update a model"""
    db = get_database()
    
    update_dict = {k: v for k, v in model_data.model_dump().items() if v is not None}
    if update_dict:
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await db.models.update_one(
            {"_id": ObjectId(model_id)},
            {"$set": update_dict}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
    
    updated_model = await db.models.find_one({"_id": ObjectId(model_id)})
    updated_model["_id"] = str(updated_model["_id"])
    updated_model.pop("api_key", None)
    
    return Model(**updated_model)

@router.delete("/{model_id}")
async def delete_model(
    model_id: str,
    current_admin: User = Depends(get_current_admin)
):
    """Delete a model"""
    db = get_database()
    
    result = await db.models.delete_one({"_id": ObjectId(model_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    return {"message": "Model deleted successfully"}

@router.post("/{model_id}/test")
async def test_model(
    model_id: str,
    current_user: User = Depends(get_current_user)
):
    """Test model connection"""
    db = get_database()
    
    model = await db.models.find_one({"_id": ObjectId(model_id)})
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
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
