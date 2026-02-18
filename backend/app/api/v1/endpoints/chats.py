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
async def get_chats(current_user: User = Depends(get_current_user), include_messages: bool = True):
    """Get all user chats (optimized with GSI query)"""
    db = get_dynamodb()
    table = db.get_table(settings.CHATS_TABLE)
    
    # Use GSI query instead of scan for much better performance
    # This queries the user-id-index and automatically sorts by updated_at (newest first)
    
    if include_messages:
        # Full chats with messages
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': current_user.id},
            ScanIndexForward=False,  # Sort descending (newest first)
            Limit=50  # Limit to 50 most recent chats for faster initial load
        )
    else:
        # Lightweight: exclude messages for faster initial load
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': current_user.id},
            ScanIndexForward=False,
            Limit=50,
            ProjectionExpression='id, user_id, title, chat_type, participant_id, conversation_id, pinned, created_at, updated_at'
        )
    
    chats = [decimal_to_float(item) for item in response.get('Items', [])]
    
    # Add empty messages array if not included
    if not include_messages:
        for chat in chats:
            chat['messages'] = []
    
    # Sort by pinned status (pinned chats first), then by updated_at
    chats.sort(key=lambda x: (not x.get('pinned', False), x.get('updated_at', '')), reverse=True)
    
    return chats

@router.post("/", response_model=Chat, status_code=status.HTTP_201_CREATED)
def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new chat"""
    db = get_dynamodb()
    chats_table = db.get_table(settings.CHATS_TABLE)
    
    # Check chat limit for user's role
    if current_user.custom_role:
        roles_table = db.get_table(settings.ROLES_TABLE)
        role_response = roles_table.get_item(Key={'id': current_user.custom_role})
        
        if 'Item' in role_response:
            role = decimal_to_float(role_response['Item'])
            max_chats = role.get('max_chats')
            
            if max_chats is not None:
                # Count existing chats for this user
                chats_response = chats_table.scan(
                    FilterExpression='user_id = :user_id',
                    ExpressionAttributeValues={':user_id': current_user.id}
                )
                current_chat_count = len(chats_response.get('Items', []))
                
                if current_chat_count >= max_chats:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Chat limit reached. Your role allows maximum {max_chats} chats."
                    )
    
    chat_dict = chat_data.model_dump()
    chat_dict['id'] = str(uuid.uuid4())
    chat_dict['user_id'] = current_user.id
    chat_dict['shared'] = False
    chat_dict['shared_with'] = []
    chat_dict['created_at'] = datetime.utcnow().isoformat()
    chat_dict['updated_at'] = datetime.utcnow().isoformat()
    
    chats_table.put_item(Item=chat_dict)
    
    return Chat(**chat_dict)

@router.put("/{chat_id}/", response_model=Chat)
def update_chat(
    chat_id: str,
    chat_data: ChatUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a chat"""
    db = get_dynamodb()
    table = db.get_table(settings.CHATS_TABLE)
    
    # First verify the chat belongs to the user
    response = table.get_item(Key={'id': chat_id})
    
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
    
    response = table.update_item(
        Key={'id': chat_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_names if expr_names else None,
        ExpressionAttributeValues=expr_values,
        ReturnValues='ALL_NEW'
    )
    
    updated_chat = decimal_to_float(response['Attributes'])
    
    return Chat(**updated_chat)

@router.get("/{chat_id}/", response_model=Chat)
async def get_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a single chat with all messages"""
    db = get_dynamodb()
    table = db.get_table(settings.CHATS_TABLE)
    
    response = table.get_item(Key={'id': chat_id})
    
    if 'Item' not in response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    chat = decimal_to_float(response['Item'])
    
    if chat.get('user_id') != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this chat"
        )
    
    return Chat(**chat)

@router.delete("/{chat_id}/")
def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a chat"""
    db = get_dynamodb()
    table = db.get_table(settings.CHATS_TABLE)
    
    # First verify the chat belongs to the user
    response = table.get_item(Key={'id': chat_id})
    
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
    
    table.delete_item(Key={'id': chat_id})
    
    return {"message": "Chat deleted successfully"}

@router.post("/{chat_id}/messages/", response_model=Chat)
def send_message(
    chat_id: str,
    message: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a message in a chat"""
    db = get_dynamodb()
    chats_table = db.get_table(settings.CHATS_TABLE)
    
    # First verify the chat belongs to the user
    response = chats_table.get_item(Key={'id': chat_id})
    
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
    
    # Check context length limit
    if current_user.custom_role:
        roles_table = db.get_table(settings.ROLES_TABLE)
        role_response = roles_table.get_item(Key={'id': current_user.custom_role})
        
        if 'Item' in role_response:
            role = decimal_to_float(role_response['Item'])
            context_length = role.get('context_length', 4096)
            
            # Estimate current token count (rough: 4 chars per token)
            messages = chat.get('messages', [])
            current_tokens = sum(len(msg.get('content', '')) // 4 + 10 for msg in messages)
            new_message_tokens = len(message.content) // 4 + 10
            
            if current_tokens + new_message_tokens > context_length:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Context length limit exceeded. Current: ~{current_tokens} tokens, Limit: {context_length} tokens. Please start a new chat."
                )
    
    message_dict = message.model_dump()
    message_dict['timestamp'] = datetime.utcnow().isoformat()
    message_dict['sender_id'] = current_user.id  # Add sender ID
    
    # Get current messages and append new one
    messages = chat.get('messages', [])
    messages.append(message_dict)
    
    timestamp = datetime.utcnow().isoformat()
    
    # Update chat with new message
    response = chats_table.update_item(
        Key={'id': chat_id},
        UpdateExpression='SET messages = :messages, updated_at = :updated_at',
        ExpressionAttributeValues={
            ':messages': messages,
            ':updated_at': timestamp
        },
        ReturnValues='ALL_NEW'
    )
    
    updated_chat = decimal_to_float(response['Attributes'])
    
    # If this is a direct chat, sync the message to the other user's chat
    if chat.get('chat_type') == 'direct' and chat.get('conversation_id'):
        conversation_id = chat.get('conversation_id')
        participant_id = chat.get('participant_id')
        
        # Find the other user's chat entry
        participant_response = chats_table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': participant_id}
        )
        
        participant_chats = [decimal_to_float(item) for item in participant_response.get('Items', [])]
        for p_chat in participant_chats:
            if p_chat.get('conversation_id') == conversation_id:
                # Update the participant's chat with the same message
                p_messages = p_chat.get('messages', [])
                p_messages.append(message_dict)
                
                chats_table.update_item(
                    Key={'id': p_chat['id']},
                    UpdateExpression='SET messages = :messages, updated_at = :updated_at',
                    ExpressionAttributeValues={
                        ':messages': p_messages,
                        ':updated_at': timestamp
                    }
                )
                break
    
    return Chat(**updated_chat)


@router.get("/paginated/", response_model=dict)
async def get_chats_paginated(
    limit: int = 20,
    last_key: str = None,
    current_user: User = Depends(get_current_user)
):
    """Get user chats with pagination support"""
    db = get_dynamodb()
    table = db.get_table(settings.CHATS_TABLE)
    
    query_params = {
        'IndexName': 'user-id-index',
        'KeyConditionExpression': 'user_id = :user_id',
        'ExpressionAttributeValues': {':user_id': current_user.id},
        'ScanIndexForward': False,
        'Limit': limit
    }
    
    # Add pagination token if provided
    if last_key:
        import json
        query_params['ExclusiveStartKey'] = json.loads(last_key)
    
    response = table.query(**query_params)
    
    chats = [decimal_to_float(item) for item in response.get('Items', [])]
    
    # Sort by pinned status
    chats.sort(key=lambda x: (not x.get('pinned', False), x.get('updated_at', '')), reverse=True)
    
    result = {
        'chats': chats,
        'has_more': 'LastEvaluatedKey' in response
    }
    
    if 'LastEvaluatedKey' in response:
        import json
        result['last_key'] = json.dumps(response['LastEvaluatedKey'])
    
    return result


@router.post("/direct/", response_model=Chat, status_code=status.HTTP_201_CREATED)
def create_direct_chat(
    participant_id: str,
    current_user: User = Depends(get_current_user)
):
    """Create or get existing direct message chat with another user (creates for both users)"""
    if participant_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create direct chat with yourself"
        )
    
    db = get_dynamodb()
    chats_table = db.get_table(settings.CHATS_TABLE)
    users_table = db.get_table(settings.USERS_TABLE)
    
    # Verify participant exists
    participant_response = users_table.get_item(Key={'id': participant_id})
    if 'Item' not in participant_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    participant = decimal_to_float(participant_response['Item'])
    
    # Check if direct chat already exists for current user
    response = chats_table.query(
        IndexName='user-id-index',
        KeyConditionExpression='user_id = :user_id',
        ExpressionAttributeValues={':user_id': current_user.id}
    )
    
    existing_chats = [decimal_to_float(item) for item in response.get('Items', [])]
    for chat in existing_chats:
        if chat.get('chat_type') == 'direct' and chat.get('participant_id') == participant_id:
            return Chat(**chat)
    
    # Generate a shared conversation ID for linking both chat entries
    conversation_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    # Create chat entry for current user
    current_user_chat = {
        'id': str(uuid.uuid4()),
        'user_id': current_user.id,
        'title': f"Chat with {participant.get('name', 'User')}",
        'chat_type': 'direct',
        'participant_id': participant_id,
        'conversation_id': conversation_id,  # Link both chats
        'messages': [],
        'pinned': False,
        'shared': False,
        'shared_with': [],
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    # Create chat entry for participant
    participant_chat = {
        'id': str(uuid.uuid4()),
        'user_id': participant_id,
        'title': f"Chat with {current_user.name}",
        'chat_type': 'direct',
        'participant_id': current_user.id,
        'conversation_id': conversation_id,  # Same conversation ID
        'messages': [],
        'pinned': False,
        'shared': False,
        'shared_with': [],
        'created_at': timestamp,
        'updated_at': timestamp
    }
    
    # Save both chat entries
    chats_table.put_item(Item=current_user_chat)
    chats_table.put_item(Item=participant_chat)
    
    return Chat(**current_user_chat)
