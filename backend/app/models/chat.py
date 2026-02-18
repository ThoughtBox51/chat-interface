from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Message(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sender_id: Optional[str] = None  # ID of user who sent the message

class ChatBase(BaseModel):
    title: str = "New Chat"
    model_id: Optional[str] = None
    pinned: bool = False
    chat_type: str = "ai"  # "ai" or "direct"
    participant_id: Optional[str] = None  # For direct messages
    conversation_id: Optional[str] = None  # Links both sides of direct chat

class ChatCreate(ChatBase):
    messages: List[Message] = []

class ChatUpdate(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None

class ChatInDB(ChatBase):
    id: str
    user_id: str
    messages: List[Message] = []
    shared: bool = False
    shared_with: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class Chat(ChatInDB):
    pass

class MessageCreate(BaseModel):
    role: str
    content: str
