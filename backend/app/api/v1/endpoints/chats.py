from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from app.core.database import get_database
from app.models.chat import ChatCreate, ChatUpdate, Chat, MessageCreate
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[Chat])
async def get_chats(current_user: User = Depends(get_current_user)):
    """Get all user chats"""
    db = get_database()
    chats = await db.chats.find({"user_id": current_user.id}).sort([
        ("pinned", -1), ("updated_at", -1)
    ]).to_list(100)
    
    for chat in chats:
        chat["_id"] = str(chat["_id"])
    
    return chats

@router.post("/", response_model=Chat, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new chat"""
    db = get_database()
    
    chat_dict = chat_data.model_dump()
    chat_dict["user_id"] = current_user.id
    chat_dict["created_at"] = datetime.utcnow()
    chat_dict["updated_at"] = datetime.utcnow()
    
    result = await db.chats.insert_one(chat_dict)
    
    created_chat = await db.chats.find_one({"_id": result.inserted_id})
    created_chat["_id"] = str(created_chat["_id"])
    
    return Chat(**created_chat)

@router.put("/{chat_id}", response_model=Chat)
async def update_chat(
    chat_id: str,
    chat_data: ChatUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a chat"""
    db = get_database()
    
    update_dict = {k: v for k, v in chat_data.model_dump().items() if v is not None}
    if update_dict:
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await db.chats.update_one(
            {"_id": ObjectId(chat_id), "user_id": current_user.id},
            {"$set": update_dict}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
    
    updated_chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    updated_chat["_id"] = str(updated_chat["_id"])
    
    return Chat(**updated_chat)


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a chat"""
    db = get_database()
    
    result = await db.chats.delete_one({
        "_id": ObjectId(chat_id),
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    return {"message": "Chat deleted successfully"}

@router.post("/{chat_id}/messages", response_model=Chat)
async def send_message(
    chat_id: str,
    message: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a message in a chat"""
    db = get_database()
    
    chat = await db.chats.find_one({
        "_id": ObjectId(chat_id),
        "user_id": current_user.id
    })
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    message_dict = message.model_dump()
    message_dict["timestamp"] = datetime.utcnow()
    
    await db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {
            "$push": {"messages": message_dict},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    updated_chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    updated_chat["_id"] = str(updated_chat["_id"])
    
    return Chat(**updated_chat)
