from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from bson import ObjectId

class Message(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatBase(BaseModel):
    title: str = "New Chat"
    model_id: Optional[str] = None
    pinned: bool = False

class ChatCreate(ChatBase):
    messages: List[Message] = []

class ChatUpdate(BaseModel):
    title: Optional[str] = None
    pinned: Optional[bool] = None

class ChatInDB(ChatBase):
    id: str = Field(alias="_id")
    user_id: str
    messages: List[Message] = []
    shared: bool = False
    shared_with: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class Chat(ChatInDB):
    pass

class MessageCreate(BaseModel):
    role: str
    content: str
