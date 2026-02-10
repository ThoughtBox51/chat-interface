from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime
import uuid

from app.core.database import get_dynamodb
from app.core.config import settings
from app.models.chat import ChatCreate, ChatUpdate, Chat, MessageCreate
from app.models.user import User
from app.api.deps import get_current_user, decimal_to_float

router = APIRouter()

@router.get("/", response_model=List[Chat])
async def get_chats(current_user: User = Depends(get_current_user)):
    """Get all user chats"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.CHATS_TABLE)
        
        # Scan for user's chats
        response = await table.scan(
            FilterExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': current_user.id}
        )
        
        chats = [decimal_to_float(item) for item in response.get('Items', [])]
        
        # Sort by pinned and updated_at
        chats.sort(key=lambda x: (not x.get('pinned', False), x.get('updated_at', '')), reverse=True)
        
        return chats

@router.post("/", response_model=Chat, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new chat"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.CHATS_TABLE)
        
        chat_dict = chat_data.model_dump()
        chat_dict['id'] = str(uuid.uuid4())
        chat_dict['user_id'] = current_user.id
        chat_dict['shared'] = False
        chat_dict['shared_with'] = []
        chat_dict['created_at'] = datetime.utcnow().isoformat()
        chat_dict['updated_at'] = datetime.utcnow().isoformat()
        
        await table.put_item(Item=chat_dict)
        
        return Chat(**chat_dict)

@router.put("/{chat_id}", response_model=Chat)
async def update_chat(
    chat_id: str,
    chat_data: ChatUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a chat"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.CHATS_TABLE)
        
        # First verify the chat belongs to the user
        response = await table.get_item(Key={'id': chat_id})
        
        if 'Item' not in response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
        
        chat = decimal_to_float(response['Item'])
        
        if chat.get('user_id') != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this chat"
            )
        
        update_dict = {k: v for k, v in chat_data.model_dump().items() if v is not None}
        
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
            expr_values[attr_value] = value
        
        response = await table.update_item(
            Key={'id': chat_id},
            UpdateExpression=update_expr,
            ExpressionAttributeNames=expr_names if expr_names else None,
            ExpressionAttributeValues=expr_values,
            ReturnValues='ALL_NEW'
        )
        
        updated_chat = decimal_to_float(response['Attributes'])
        
        return Chat(**updated_chat)

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a chat"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.CHATS_TABLE)
        
        # First verify the chat belongs to the user
        response = await table.get_item(Key={'id': chat_id})
        
        if 'Item' not in response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
        
        chat = decimal_to_float(response['Item'])
        
        if chat.get('user_id') != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this chat"
            )
        
        await table.delete_item(Key={'id': chat_id})
        
        return {"message": "Chat deleted successfully"}

@router.post("/{chat_id}/messages", response_model=Chat)
async def send_message(
    chat_id: str,
    message: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a message in a chat"""
    db = get_dynamodb()
    async with db.get_resource() as dynamodb:
        table = await dynamodb.Table(settings.CHATS_TABLE)
        
        # First verify the chat belongs to the user
        response = await table.get_item(Key={'id': chat_id})
        
        if 'Item' not in response:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
        
        chat = decimal_to_float(response['Item'])
        
        if chat.get('user_id') != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to send messages in this chat"
            )
        
        message_dict = message.model_dump()
        message_dict['timestamp'] = datetime.utcnow().isoformat()
        
        # Get current messages and append new one
        messages = chat.get('messages', [])
        messages.append(message_dict)
        
        # Update chat with new message
        response = await table.update_item(
            Key={'id': chat_id},
            UpdateExpression='SET messages = :messages, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':messages': messages,
                ':updated_at': datetime.utcnow().isoformat()
            },
            ReturnValues='ALL_NEW'
        )
        
        updated_chat = decimal_to_float(response['Attributes'])
        
        return Chat(**updated_chat)
