from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "LLM Chat API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # AWS DynamoDB
    AWS_REGION: str = "us-east-1"
    AWS_PROFILE: str = ""  # AWS profile name (optional)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    DYNAMODB_ENDPOINT_URL: str = ""  # Leave empty for AWS, or use local endpoint
    
    # Table names
    USERS_TABLE: str = "chat_app_users"
    MODELS_TABLE: str = "chat_app_models"
    ROLES_TABLE: str = "chat_app_roles"
    CHATS_TABLE: str = "chat_app_chats"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = '["http://localhost:5173"]'
    
    @field_validator('BACKEND_CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [v]
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields from .env

settings = Settings()
