from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class Header(BaseModel):
    key: str
    value: str
    secure: bool = False

class ModelBase(BaseModel):
    name: str
    display_name: Optional[str] = None
    provider: Optional[str] = None
    integration_type: str
    endpoint: Optional[str] = None
    auth_profile: str = "none"
    configuration_type: str = "default"
    body: Optional[str] = None
    is_active: bool = True
    variables: Optional[Dict] = {}
    test_response: Optional[str] = None
    structured_response: bool = False
    data_generation: bool = False
    streaming: bool = False
    tool_calling: Optional[Dict] = {}
    modalities: Optional[List[str]] = []

class ModelCreate(ModelBase):
    api_key: Optional[str] = None
    headers: Optional[List[Header]] = []

class ModelUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    provider: Optional[str] = None
    endpoint: Optional[str] = None
    api_key: Optional[str] = None
    headers: Optional[List[Header]] = None
    auth_profile: Optional[str] = None
    configuration_type: Optional[str] = None
    body: Optional[str] = None
    is_active: Optional[bool] = None
    variables: Optional[Dict] = None
    test_response: Optional[str] = None
    structured_response: Optional[bool] = None
    data_generation: Optional[bool] = None
    streaming: Optional[bool] = None
    tool_calling: Optional[Dict] = None
    modalities: Optional[List[str]] = None

class ModelInDB(ModelBase):
    id: str
    api_key: Optional[str] = None
    headers: List[Header] = []
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

class Model(BaseModel):
    id: str
    name: str
    display_name: Optional[str] = None
    provider: Optional[str] = None
    integration_type: str
    endpoint: Optional[str] = None
    auth_profile: str
    configuration_type: str
    is_active: bool
    headers: Optional[List[Header]] = []
    variables: Optional[Dict] = {}
    body: Optional[str] = None
    test_response: Optional[str] = None
    structured_response: bool = False
    data_generation: bool = False
    streaming: bool = False
    tool_calling: Optional[Dict] = {}
    modalities: Optional[List[str]] = []
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
