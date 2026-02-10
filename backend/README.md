# LLM Chat Application - FastAPI Backend

Python FastAPI backend with MongoDB, JWT authentication, and RBAC.

## Features

- **FastAPI** - Modern, fast web framework
- **MongoDB** with Motor (async driver)
- **JWT Authentication** with password hashing
- **Role-Based Access Control (RBAC)**
- **Automatic Swagger Documentation** at `/docs`
- **ReDoc Documentation** at `/redoc`
- **Async/Await** throughout
- **Pydantic** for data validation

## Setup

1. **Install Python 3.10+**

2. **Create virtual environment:**
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and secret key
```

5. **Run the server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **OpenAPI JSON**: http://localhost:5000/api/openapi.json

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Users (Admin only)
- `GET /api/users` - Get all active users
- `GET /api/users/pending` - Get pending users
- `PUT /api/users/{user_id}/approve` - Approve user
- `PUT /api/users/{user_id}/role` - Update user role
- `DELETE /api/users/{user_id}` - Delete user

### Models
- `GET /api/models` - Get all models
- `POST /api/models` - Create model (admin)
- `PUT /api/models/{model_id}` - Update model (admin)
- `DELETE /api/models/{model_id}` - Delete model (admin)
- `POST /api/models/{model_id}/test` - Test model connection

### Roles (Admin only)
- `GET /api/roles` - Get all roles
- `POST /api/roles` - Create role
- `PUT /api/roles/{role_id}` - Update role
- `DELETE /api/roles/{role_id}` - Delete role

### Chats
- `GET /api/chats` - Get user chats
- `POST /api/chats` - Create chat
- `PUT /api/chats/{chat_id}` - Update chat
- `DELETE /api/chats/{chat_id}` - Delete chat
- `POST /api/chats/{chat_id}/messages` - Send message

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # Dependencies (auth)
│   │   └── v1/
│   │       ├── api.py           # API router
│   │       └── endpoints/       # API endpoints
│   │           ├── auth.py
│   │           ├── users.py
│   │           ├── models.py
│   │           ├── roles.py
│   │           └── chats.py
│   ├── core/
│   │   ├── config.py            # Settings
│   │   ├── database.py          # MongoDB connection
│   │   └── security.py          # JWT & password hashing
│   ├── models/                  # Pydantic models
│   │   ├── user.py
│   │   ├── model.py
│   │   ├── role.py
│   │   └── chat.py
│   └── main.py                  # FastAPI app
├── requirements.txt
├── .env.example
└── README.md
```

## Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Bearer token authentication
- CORS configured
- Admin-only routes protected
- User status validation (pending/active/suspended)

## Development

Run with auto-reload:
```bash
uvicorn app.main:app --reload --port 5000
```

## Production

Run with Gunicorn:
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:5000
```
