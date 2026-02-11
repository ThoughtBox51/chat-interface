from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_dynamodb, close_dynamodb
from app.api.v1.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"AWS Profile: '{settings.AWS_PROFILE}'")
    print(f"AWS Region: {settings.AWS_REGION}")
    await init_dynamodb()
    yield
    # Shutdown
    await close_dynamodb()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="LLM Chat Application API with RBAC and DynamoDB",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    redirect_slashes=False  # Disable automatic redirect for trailing slashes
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "message": "LLM Chat API with DynamoDB",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "database": "DynamoDB"}
