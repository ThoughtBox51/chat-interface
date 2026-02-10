from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, models, roles, chats

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])
api_router.include_router(chats.router, prefix="/chats", tags=["Chats"])
